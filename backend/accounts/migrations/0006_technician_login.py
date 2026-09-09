import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_backfill_userprofile_roles'),
    ]

    operations = [
        # New PURPOSE_TECHNICIAN_LOGIN choice on PhoneOTP — a metadata-only
        # change (choices aren't a DB-level constraint on MySQL/MariaDB for
        # a plain CharField), so this touches no existing PhoneOTP rows.
        migrations.AlterField(
            model_name='phoneotp',
            name='purpose',
            field=models.CharField(
                choices=[
                    ('login', 'Login'),
                    ('registration', 'Registration'),
                    ('change_mobile', 'Change mobile number'),
                    ('technician_login', 'Technician login'),
                ],
                default='login',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='technicianprofile',
            name='profile_image',
            field=models.ImageField(
                blank=True, help_text='Shown in Django Admin and the technician dashboard.', upload_to='technicians/'
            ),
        ),
        migrations.AddField(
            model_name='technicianprofile',
            name='updated_at',
            # auto_now + a one-off default so existing technician rows (which
            # predate this column) get a real timestamp instead of failing
            # the NOT NULL constraint — every save from here on sets the real
            # edit time as normal. Same pattern as bookings/migrations/
            # 0005_service_content_and_features.py's created_at/updated_at.
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
