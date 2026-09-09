from django.db import migrations

# One-time seed matching frontend/src/data/services.ts's 4 existing service
# ids/names/startingPrice values exactly (min_price = that file's
# startingPrice; max_price = roughly double, rounded) — an admin can retune
# either price via Django Admin afterward; this is not a permanent link to
# that frontend file.
SERVICES = [
    {'slug': 'ac', 'name': 'AC Service', 'min_price': 499, 'max_price': 999},
    {'slug': 'washing-machine', 'name': 'Washing Machine', 'min_price': 399, 'max_price': 799},
    {'slug': 'microwave', 'name': 'Microwave', 'min_price': 299, 'max_price': 599},
    {'slug': 'refrigerator', 'name': 'Refrigerator', 'min_price': 449, 'max_price': 899},
]


def seed_services(apps, schema_editor):
    Service = apps.get_model('bookings', 'Service')
    for entry in SERVICES:
        Service.objects.update_or_create(slug=entry['slug'], defaults=entry)


def remove_services(apps, schema_editor):
    Service = apps.get_model('bookings', 'Service')
    Service.objects.filter(slug__in=[entry['slug'] for entry in SERVICES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_service_booking_bookingimage'),
    ]

    operations = [
        migrations.RunPython(seed_services, remove_services),
    ]
