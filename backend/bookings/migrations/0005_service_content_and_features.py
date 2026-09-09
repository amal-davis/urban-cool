import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0004_booking_location_updated_at_and_more'),
    ]

    operations = [
        # Renamed (not dropped + re-added) so existing Service rows keep
        # their pricing — a plain AddField/RemoveField pair would silently
        # lose the values seeded by 0003_seed_services.py.
        migrations.RenameField(
            model_name='service',
            old_name='min_price',
            new_name='estimated_price_from',
        ),
        migrations.RenameField(
            model_name='service',
            old_name='max_price',
            new_name='estimated_price_to',
        ),
        migrations.AlterField(
            model_name='service',
            name='estimated_price_from',
            field=models.PositiveIntegerField(
                help_text='Estimated cost range shown to the customer — lower bound. Not a guaranteed final price.'
            ),
        ),
        migrations.AlterField(
            model_name='service',
            name='estimated_price_to',
            field=models.PositiveIntegerField(
                help_text='Estimated cost range shown to the customer — upper bound. Not a guaranteed final price.'
            ),
        ),
        migrations.AlterField(
            model_name='service',
            name='slug',
            field=models.SlugField(
                help_text='Used in the service URL. Cannot be changed once created.', primary_key=True, serialize=False
            ),
        ),
        migrations.AlterField(
            model_name='service',
            name='is_active',
            field=models.BooleanField(default=True, help_text='Only active services are shown on the public site.'),
        ),
        migrations.AddField(
            model_name='service',
            name='short_description',
            field=models.CharField(
                blank=True,
                default='',
                help_text='One sentence shown on the service card and in page previews.',
                max_length=300,
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='full_description',
            field=models.TextField(
                blank=True, default='', help_text='Full description shown on the service detail page.'
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='image',
            field=models.ImageField(
                blank=True, help_text='Shown on the service card and detail page.', upload_to='services/'
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='display_order',
            field=models.PositiveIntegerField(default=0, help_text='Lower numbers show first on the Services page.'),
        ),
        migrations.AddField(
            model_name='service',
            name='created_at',
            # auto_now_add + a one-off default so the existing 4 seeded rows
            # (which predate this column) get a real timestamp instead of
            # failing the NOT NULL constraint — every row created from here
            # on gets the real creation time as normal.
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='service',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterModelOptions(
            name='service',
            options={'ordering': ['display_order', 'name'], 'verbose_name': 'service', 'verbose_name_plural': 'services'},
        ),
        migrations.CreateModel(
            name='ServiceFeature',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=150)),
                ('display_order', models.PositiveIntegerField(default=0)),
                (
                    'service',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE, related_name='features', to='bookings.service'
                    ),
                ),
            ],
            options={
                'verbose_name': 'service feature',
                'verbose_name_plural': 'service features',
                'ordering': ['display_order', 'id'],
            },
        ),
    ]
