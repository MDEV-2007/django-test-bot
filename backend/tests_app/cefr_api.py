"""CEFR imtihon ekranining API'si.

NEGA ALOHIDA OQIM
-----------------
Platformaning eski oqimi "bitta savol — bitta ekran". CEFR uchun bu ishlamaydi: 21-29
savollar bitta matnga, 9-14 savollar bitta audioga tayanadi va o'quvchi matnni ko'rib
turib javob berishi kerak. Shuning uchun bu yerda butun urinish BIR SO'ROVDA beriladi:
partlar, matn/audio/rasm va ularning savollari. Klient hammasini bir varaqda ko'rsatadi,
javoblarni esa fon rejimida bittalab saqlaydi.

Baholash bu yerda ham server tomonda qoladi: to'g'ri javoblar payload'ga hech qachon
qo'shilmaydi (finish_api tugatgandan keyingina ko'rinadi).
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Attempt, AttemptAnswer, ExamSection, Question
from .services.answering import apply_answer
from .services.writing import count_words, review_writing

# Bitta partda saqlanadigan belgilar (highlight) soni chegarasi — bo'yalgan matn
# baholashga ta'sir qilmaydi, lekin cheksiz o'sib ketmasligi kerak.
MAX_ANNOTATIONS_PER_SECTION = 200


def _writing_review_payload(answer):
    """Writing tekshiruvi natijasi — faqat baholatilgan bo'lsa."""
    if answer.ai_score is None:
        return None
    return {
        'overall': answer.ai_score,
        'level': answer.ai_level,
        **(answer.open_grading or {}),
    }


def _question_payload(question, answer):
    """Bitta savolning imtihon ekrani uchun ma'lumoti. To'g'ri javob YO'Q."""
    qtype = question.question_type
    data = {
        'id': question.id,
        'exam_number': question.exam_number,
        'type': qtype,
        'body': question.body,
        'points': question.points,
        'image': question.image.url if question.image else (question.image_url or ''),
        'audio_url': question.audio_url or '',
        'answered': not answer.is_skipped,
    }

    if qtype in Question.SINGLE_ANSWER_TYPES:
        data['choices'] = [{'id': c.id, 'text': c.text} for c in question.choices.all()]
        data['selected_choice_id'] = answer.selected_choice_id
    elif qtype == 'grouped_item':
        data['group_id'] = question.group_id
        data['selected_group_option_id'] = answer.grouped_option_id
    elif qtype == 'matching':
        pairs = list(question.matching_pairs.all())
        submitted = answer.matching_data or {}
        data['matching_options'] = [{'right_key': p.right_key, 'right_text': p.right_text} for p in pairs]
        data['matching_rows'] = [
            {'left_key': p.left_key, 'left_text': p.left_text, 'selected_right_key': submitted.get(p.left_key, '')}
            for p in pairs if p.left_key
        ]
    elif qtype == 'gap_fill':
        data['max_words'] = question.max_words or 1
        data['text_answer'] = answer.text_answer
    elif qtype == 'tfng':
        data['tfng_options'] = question.tfng_options
        data['text_answer'] = answer.text_answer
    elif qtype == 'writing_task':
        data['min_words'] = question.min_words
        data['max_words'] = question.max_words
        data['text_answer'] = answer.text_answer
        data['word_count'] = count_words(answer.text_answer)
        # Tekshiruv premium: o'quvchi bepul yozadi, natija esa faqat baholatgandan keyin.
        data['review'] = _writing_review_payload(answer)
    elif qtype == 'open_written':
        submitted_open = answer.open_answers or {}
        data['sub_question_rows'] = [
            {'label': sq.label, 'text': sq.text, 'answer': submitted_open.get(sq.label, '')}
            for sq in question.sub_questions.all()
        ]
        data['text_answer'] = answer.text_answer

    return data


def _section_payload(section, answers_by_question):
    questions = [q for q in section.questions.all() if q.id in answers_by_question]
    groups, seen_groups = [], set()
    for question in questions:
        if question.group_id and question.group_id not in seen_groups:
            seen_groups.add(question.group_id)
            groups.append({
                'id': question.group.id,
                'instruction': question.group.instruction,
                'options': [
                    {'id': o.id, 'label': o.label, 'text': o.text}
                    for o in question.group.options.all()
                ],
            })

    return {
        'id': section.id,
        'skill': section.skill,
        'part_number': section.part_number,
        'title': section.title,
        'instruction': section.instruction,
        'passage': section.passage,
        'audio': section.audio_src,
        'audio_play_limit': section.audio_play_limit,
        'image': section.image.url if section.image else '',
        'duration_minutes': section.duration_minutes,
        # Umumiy javob banklari (A-F) — bitta bank bir nechta savolga xizmat qiladi,
        # shuning uchun har savolda takrorlanmaydi, part darajasida bir marta beriladi.
        'groups': groups,
        'questions': [_question_payload(q, answers_by_question[q.id]) for q in questions],
    }


@api_view(['GET'])
def exam_api(request, attempt_id):
    """Butun urinish: partlar, matn/audio va savollar — bitta so'rovda."""
    attempt = get_object_or_404(
        Attempt.objects.select_related('test'), id=attempt_id, profile=request.user.profile)

    answers = list(
        attempt.answers
        .select_related('question', 'question__group', 'question__section')
        .prefetch_related(
            'question__choices', 'question__matching_pairs',
            'question__sub_questions', 'question__group__options',
        )
        .order_by('question__exam_number', 'id')
    )
    answers_by_question = {a.question_id: a for a in answers}

    sections = (
        ExamSection.objects.filter(test_set=attempt.test)
        .prefetch_related('questions__choices', 'questions__group__options',
                          'questions__matching_pairs', 'questions__sub_questions')
        if attempt.test_id else []
    )

    section_payloads = [_section_payload(s, answers_by_question) for s in sections]
    section_payloads = [s for s in section_payloads if s['questions']]

    # Partga bog'lanmagan savollar (oddiy testlar yoki eski CEFR to'plamlari) yo'qolib
    # qolmasligi kerak — ular "part'siz" ro'yxat sifatida oxirida beriladi.
    grouped_ids = {q['id'] for s in section_payloads for q in s['questions']}
    loose = [_question_payload(a.question, a) for a in answers if a.question_id not in grouped_ids]

    return Response({
        'attempt_id': attempt.id,
        'is_completed': attempt.is_completed,
        # Vaqtning yagona manbai — server soati (Attempt.seconds_left).
        'seconds_left': attempt.seconds_left(),
        'test': {
            'id': attempt.test_id,
            'title': attempt.test.title if attempt.test else 'Test',
            'category': attempt.test.category if attempt.test else '',
            'duration_minutes': attempt.duration_minutes,
        },
        'sections': section_payloads,
        'loose_questions': loose,
        'annotations': attempt.annotations or {},
        # Har bir Listening parti necha marta eshitilgani — cheklov serverda sanaladi.
        'audio_plays': attempt.audio_plays or {},
    })


@api_view(['POST'])
def exam_answer_api(request, attempt_id):
    """Bitta savol javobini saqlaydi. Klient uni avtomatik (debounce bilan) yuboradi,
    shuning uchun javob qisqa: faqat shu savolning yangi holati."""
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        return Response({'error': 'attempt already finished', 'completed': True}, status=409)
    if attempt.is_time_up:
        return Response({'error': 'time_up', 'time_up': True,
                          'message': "Test vaqti tugadi."}, status=409)

    answer = get_object_or_404(
        AttemptAnswer.objects.select_related('question', 'question__group'),
        attempt=attempt, question_id=request.data.get('question_id'))

    apply_answer(answer, request.data)
    answer.save()

    return Response({
        'question_id': answer.question_id,
        'answered': not answer.is_skipped,
        'saved_at': timezone.now().isoformat(),
    })


@api_view(['POST'])
def annotations_api(request, attempt_id):
    """Matn ustidagi belgilarni (highlight/qayd) saqlaydi.

    Butun blob yuboriladi va butunicha almashtiriladi — belgilar baholashga umuman
    ta'sir qilmaydi, shuning uchun bu yerda qat'iy validatsiya emas, faqat hajm
    chegarasi muhim."""
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)

    payload = request.data.get('annotations')
    if not isinstance(payload, dict):
        return Response({'error': 'annotations must be an object'}, status=400)

    cleaned = {}
    for section_id, items in payload.items():
        if not isinstance(items, list):
            continue
        cleaned[str(section_id)] = [item for item in items[:MAX_ANNOTATIONS_PER_SECTION]
                                    if isinstance(item, dict)]

    attempt.annotations = cleaned
    attempt.save(update_fields=['annotations'])
    return Response({'saved': True})


@api_view(['POST'])
def writing_review_api(request, attempt_id):
    """Writing javobini AI orqali baholaydi — PREMIUM.

    Yozishning o'zi bepul: javob `exam_answer_api` orqali hech qanday cheklovsiz
    saqlanadi. Faqat mezonlar bo'yicha tekshiruv (ball, daraja, xatolar ro'yxati)
    obuna talab qiladi."""
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    profile = request.user.profile

    from premium.models import unlocked_test_ids
    has_access = (
        profile.has_active_premium_lessons
        or profile.premium_mock_test_unlocked
        or (attempt.test_id and attempt.test_id in unlocked_test_ids(profile))
    )
    if not has_access:
        return Response({
            'error': 'premium_required',
            'message': "Yozgan matningizni AI tekshirib, CEFR darajasini aytishi uchun premium kerak. "
                       "Yozishning o'zi bepul — javobingiz saqlangan.",
        }, status=402)

    answer = get_object_or_404(
        AttemptAnswer.objects.select_related('question'),
        attempt=attempt, question_id=request.data.get('question_id'))
    question = answer.question
    if question.question_type != 'writing_task':
        return Response({'error': 'not a writing task'}, status=400)
    if not answer.text_answer.strip():
        return Response({'error': 'empty_answer', 'message': "Avval matn yozing."}, status=400)

    result = review_writing(
        prompt=question.body,
        answer=answer.text_answer,
        min_words=question.min_words,
        max_words=question.max_words,
    )
    if result is None:
        return Response({
            'error': 'ai_unavailable',
            'message': "Tekshiruvchi hozir band. Javobingiz saqlangan — birozdan keyin urinib ko'ring.",
        }, status=503)

    overall = result.pop('overall')
    level = result.pop('level')
    answer.ai_score = overall
    answer.ai_level = level
    answer.open_grading = result
    answer.ai_grading_note = (result.get('summary') or '')[:300]
    answer.save(update_fields=['ai_score', 'ai_level', 'open_grading', 'ai_grading_note'])

    return Response({'question_id': question.id, 'overall': overall, 'level': level, **result})


@api_view(['POST'])
def audio_play_api(request, attempt_id):
    """Listening partini eshitishni ro'yxatga oladi va nechta urinish qolganini qaytaradi.

    Hisob serverda turadi: ilgari u faqat brauzerda bo'lganida, sahifani yangilash bilan
    audioni cheksiz qayta tinglash mumkin edi. Klient tinglashni BOSHLASHDAN oldin shu
    endpointni chaqiradi va faqat `allowed: true` javobida ijro etadi."""
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed or attempt.is_time_up:
        return Response({'allowed': False, 'left': 0, 'message': "Test vaqti tugadi."}, status=409)

    section = get_object_or_404(ExamSection, id=request.data.get('section_id'), test_set=attempt.test_id)
    key = str(section.id)
    plays = attempt.audio_plays or {}
    used = int(plays.get(key) or 0)

    # 0 — cheksiz (mashq rejimi): hisob yuritilmaydi.
    if section.audio_play_limit == 0:
        return Response({'allowed': True, 'left': None, 'used': used})

    if used >= section.audio_play_limit:
        return Response({'allowed': False, 'left': 0, 'used': used,
                          'message': "Bu partni tinglash imkoni tugadi."}, status=409)

    plays[key] = used + 1
    attempt.audio_plays = plays
    attempt.save(update_fields=['audio_plays'])
    return Response({'allowed': True, 'used': plays[key],
                      'left': section.audio_play_limit - plays[key]})
