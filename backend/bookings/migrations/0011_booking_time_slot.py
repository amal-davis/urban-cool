# Hand-written (not machine-generated): makemigrations can't run this one
# non-interactively — adding a required field to an existing table needs a
# one-off default for whatever rows already exist, and there's no sensible
# real "preferred time slot" to backfill onto them. '09:00' (the first slot)
# is used ONLY to satisfy the NOT NULL backfill on this migration's existing
# rows — preserve_default=False (matching exactly what answering Django's
# own interactive "provide a one-off default" prompt does) means the model
# itself carries no default going forward: every new booking must still
# choose a slot explicitly, the same way booking_date already always has.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0010_customernotification'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='time_slot',
            field=models.CharField(
                choices=[
                    ('09:00', '9:00 AM - 11:00 AM'),
                    ('11:00', '11:00 AM - 1:00 PM'),
                    ('13:00', '1:00 PM - 3:00 PM'),
                    ('15:00', '3:00 PM - 5:00 PM'),
                    ('17:00', '5:00 PM - 7:00 PM'),
                ],
                default='09:00',
                help_text='The 2-hour arrival window the customer picked at booking time.',
                max_length=5,
            ),
            preserve_default=False,
        ),
    ]
