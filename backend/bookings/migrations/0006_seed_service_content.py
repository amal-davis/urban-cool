from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.db import migrations

# One-time content migration matching frontend/src/data/services.ts's 4
# existing services exactly (shortDescription -> short_description,
# detailIntro -> full_description, includedServices -> ServiceFeature rows,
# imageUrl's source file -> image) — this is the same "carry the existing
# content into the database rather than lose it" step 0003_seed_services.py
# already did for name/pricing, extended to the fields this migration adds.
# display_order matches ServicesPage.tsx's SERVICE_ORDER (ac, refrigerator,
# washing-machine, microwave), the order the site has always shown these in.
SERVICE_CONTENT = {
    'ac': {
        'short_description': 'Complete AC care for better cooling and fresh air.',
        'full_description': (
            "From AC units that aren't cooling properly to poor airflow, water leakage, or unusual noise, our "
            'technicians handle common AC problems along with routine servicing and maintenance.'
        ),
        'display_order': 1,
        'image_file': 'service-ac.jpg',
        'features': [
            'Full AC Cleaning (Indoor & Outdoor)',
            'Gas Pressure Check',
            'Cooling Performance Check',
            'Water Drain Check',
            'General Inspection',
        ],
    },
    'refrigerator': {
        'short_description': 'Reliable cooling care to keep your refrigerator running efficiently.',
        'full_description': (
            'Whether your refrigerator has stopped cooling properly, developed excessive frost, is making unusual '
            'noise, or leaking water, our technicians can inspect and service it — along with general maintenance '
            'to keep it running well.'
        ),
        'display_order': 2,
        'image_file': 'service-refrigerator.jpg',
        'features': [
            'Refrigerator General Inspection',
            'Cooling Performance Check',
            'Temperature Check',
            'Condenser & Coil Inspection',
            'Drainage Check',
            'General Service Inspection',
        ],
    },
    'washing-machine': {
        'short_description': 'Complete performance care to keep your washing machine running smoothly.',
        'full_description': (
            "From a washing machine that won't start to drainage issues, spinning problems, excessive vibration, "
            'or unusual noise, our technicians service and troubleshoot common washing machine problems.'
        ),
        'display_order': 3,
        'image_file': 'service-washing-machine.jpg',
        'features': [
            'Washing Machine Inspection',
            'Drum & Spin Check',
            'Water Inlet Check',
            'Drainage Check',
            'Noise & Vibration Inspection',
            'General Performance Check',
        ],
    },
    'microwave': {
        'short_description': 'Thorough inspection to keep your microwave heating safely and reliably.',
        'full_description': (
            "If your microwave isn't heating, has power-related issues, is making unusual noise, or has a door "
            'problem, our technicians can inspect it and carry out general servicing and maintenance.'
        ),
        'display_order': 4,
        'image_file': 'service-microwave.jpg',
        'features': [
            'Microwave General Inspection',
            'Heating Performance Check',
            'Power & Control Check',
            'Door & Safety Inspection',
            'Internal Component Inspection',
        ],
    },
}

# frontend/src/assets/photos/ — the actual source images the static frontend
# has been using all along, copied into MEDIA_ROOT so the Service rows can
# reference real files rather than being seeded with empty images. Resolved
# relative to BASE_DIR (backend/) rather than this migration file's own
# location so it keeps working if migrations ever get reorganized.
FRONTEND_PHOTOS_DIR = Path(settings.BASE_DIR).parent / 'frontend' / 'src' / 'assets' / 'photos'


def seed_service_content(apps, schema_editor):
    Service = apps.get_model('bookings', 'Service')
    ServiceFeature = apps.get_model('bookings', 'ServiceFeature')

    for slug, content in SERVICE_CONTENT.items():
        service = Service.objects.filter(slug=slug).first()
        if service is None:
            # This migration only ever runs after 0003_seed_services.py, so
            # in practice every one of these rows already exists — skipped
            # rather than created from scratch so this stays purely a
            # content update, not a second place services get defined.
            continue

        service.short_description = content['short_description']
        service.full_description = content['full_description']
        service.display_order = content['display_order']

        if not service.image:
            source_path = FRONTEND_PHOTOS_DIR / content['image_file']
            try:
                with open(source_path, 'rb') as source_file:
                    # save(..., save=False) — the field is populated in
                    # memory; the single service.save() below writes both
                    # this and the fields set above in one query.
                    service.image.save(content['image_file'], File(source_file), save=False)
            except OSError:
                # Dev machine doesn't have the frontend checkout alongside
                # backend/, or the file moved — leave the image blank rather
                # than fail the whole migration; an admin can upload one by
                # hand from Django Admin afterward.
                pass

        service.save()

        ServiceFeature.objects.filter(service=service).delete()
        ServiceFeature.objects.bulk_create(
            [
                ServiceFeature(service=service, title=title, display_order=index)
                for index, title in enumerate(content['features'])
            ]
        )


def unseed_service_content(apps, schema_editor):
    Service = apps.get_model('bookings', 'Service')
    ServiceFeature = apps.get_model('bookings', 'ServiceFeature')

    services = Service.objects.filter(slug__in=SERVICE_CONTENT.keys())
    ServiceFeature.objects.filter(service__in=services).delete()
    for service in services:
        service.short_description = ''
        service.full_description = ''
        service.display_order = 0
        service.image = None
        service.save()


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0005_service_content_and_features'),
    ]

    operations = [
        migrations.RunPython(seed_service_content, unseed_service_content),
    ]
