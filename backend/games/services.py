from .models import HistoricalEvent, MapChallenge, HistoricalCharacter

def seed_games_if_needed():
    """Seeds the built-in games' history content (attached to the Tarix subject) on a
    fresh database. Other subjects start empty until their content is added."""
    from tests_app.models import Subject
    tarix = Subject.objects.filter(name='Tarix').first()

    if not HistoricalEvent.objects.exists():
        HistoricalEvent.objects.create(subject=tarix, title="Amir Temur tavalludi", year=1336, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Temuriylar imperiyasi tashkil topishi", year=1370, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Ulug'bek rasadxonasi qurilishi", year=1428, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Alisher Navoiy tavalludi", year=1441, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Zahiriddin Muhammad Bobur tavalludi", year=1483, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Boburning Kobulni egallashi", year=1504, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Grijan janggi va Boburning Hindistonga yurishi", year=1526, era="medieval")

    if not MapChallenge.objects.exists():
        MapChallenge.objects.create(
            subject=tarix,
            title="Temuriylar Imperiyasi markazi",
            description="Temuriylar imperiyasi dastlab shakllangan Movarounnahr mintaqasini belgilang.",
            correct_location="Movarounnahr",
            options=["Movarounnahr", "Xuroson", "Eron", "Hindiston"],
            map_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Khorasan-Transoxiana-Khwarazm.svg/960px-Khorasan-Transoxiana-Khwarazm.svg.png"
        )

    if not HistoricalCharacter.objects.exists():
        HistoricalCharacter.objects.create(
            subject=tarix,
            name="Amir Temur",
            clue_1="1336-yilda Kesh (Hozirgi Shahrisabz) yaqinidagi Xoja Ilg'or qishlog'ida tavallud topgan.",
            clue_2="O'z davlatining poytaxti etib Samarqand shahrini tanlagan va uni ulug'vor poytaxtga aylantirgan.",
            clue_3="G'arbda Tamerlan nomi bilan tanilgan buyuk Movarounnahr sarkardasi va davlat arbobi.",
            difficulty="easy"
        )
        HistoricalCharacter.objects.create(
            subject=tarix,
            name="Zahiriddin Muhammad Bobur",
            clue_1="Andijon shahrida tug'ilgan va yoshligida taxtga o'tirgan.",
            clue_2="'Boburnoma' asari orqali jahon adabiyoti va geografiyasi rivojiga ulkan hissa qo'shgan.",
            clue_3="Hindistonda Boburiylar (Buyuk Mo'g'ullar) imperiyasining asoschisi.",
            difficulty="medium"
        )



