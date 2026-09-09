from django.db import migrations


def backfill_roles(apps, schema_editor):
    """Gives every *unambiguous* existing account a UserProfile row: staff/
    superuser accounts get ADMIN, accounts with a Customer row get CUSTOMER.
    A bare account with neither (e.g. one auto-provisioned by a first-time
    login that never completed Signup) is deliberately left without a row
    rather than guessed at — accounts/admin.py's role_display already
    renders that as '—', and accounts/views.py never depends on this model
    existing for every user, only for the technician-management API."""
    User = apps.get_model('auth', 'User')
    Customer = apps.get_model('accounts', 'Customer')
    UserProfile = apps.get_model('accounts', 'UserProfile')

    for user in User.objects.filter(is_staff=True) | User.objects.filter(is_superuser=True):
        UserProfile.objects.update_or_create(user=user, defaults={'role': 'admin'})

    customer_user_ids = Customer.objects.values_list('user_id', flat=True)
    for user in User.objects.filter(pk__in=customer_user_ids):
        UserProfile.objects.update_or_create(user=user, defaults={'role': 'customer'})


def noop_reverse(apps, schema_editor):
    # Reversible as a no-op — the rows this creates are harmless to leave in
    # place, and nothing depends on removing them to reverse 0005 cleanly.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_technicianprofile_userprofile'),
    ]

    operations = [
        migrations.RunPython(backfill_roles, noop_reverse),
    ]
