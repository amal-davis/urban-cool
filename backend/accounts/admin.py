from django import forms
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group, User
from django.core.files.uploadedfile import UploadedFile
from django.db.models import Q
from unfold.admin import ModelAdmin
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import Address, Customer, PhoneOTP, TechnicianProfile, UserProfile
from .serializers import TechnicianSerializer


@admin.register(PhoneOTP)
class PhoneOTPAdmin(ModelAdmin):
    # code_hash is a password hash (never the plaintext code), but there's
    # still no reason to show it in a list view — everything useful for
    # support/debugging is in these columns. The actual OTP digits are never
    # persisted anywhere admin-visible, only their hash.
    list_display = ('phone', 'purpose', 'created_at', 'expires_at', 'attempts', 'is_used')
    readonly_fields = ('phone', 'purpose', 'code_hash', 'created_at', 'expires_at', 'attempts', 'is_used')
    search_fields = ('phone',)
    list_filter = ('purpose', 'is_used')


@admin.register(Customer)
class CustomerAdmin(ModelAdmin):
    list_display = ('name', 'mobile_number', 'email', 'is_active_display', 'date_joined_display')
    search_fields = ('name', 'email', 'mobile_number')
    list_filter = ('user__is_active',)
    readonly_fields = ('mobile_number', 'created_at')
    ordering = ('-created_at',)

    @admin.display(boolean=True, description='Active')
    def is_active_display(self, obj):
        return obj.is_active

    @admin.display(description='Joined')
    def date_joined_display(self, obj):
        return obj.date_joined

    def has_add_permission(self, request):
        # A Customer only ever comes from completing the OTP signup flow —
        # fabricating one here would create a row with no matching User.
        return False


@admin.register(Address)
class AddressAdmin(ModelAdmin):
    list_display = ('customer', 'city', 'state', 'pincode', 'updated_at')
    search_fields = ('customer__name', 'customer__mobile_number', 'customer__email', 'city', 'pincode')
    list_filter = ('state',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-updated_at',)


class TechnicianProfileAdminForm(forms.ModelForm):
    """Excludes `user` — TechnicianProfileAdmin.save_model below creates the
    underlying User (and its UserProfile role) automatically, by delegating
    to the exact same TechnicianSerializer the admin-only API uses (see that
    class's own docstring for why: one place "make a technician account"
    logic lives, not a second copy here).

    Validation is run here, in clean() — not in save_model — because that's
    the one place Django Admin actually expects validation errors and
    redisplays the form with them. A first attempt ran TechnicianSerializer
    from save_model instead: it worked for errors that happen to *also* be a
    Django-level model constraint (mobile_number's own unique=True catches a
    duplicate phone before save_model ever runs), but anything the
    serializer alone checks (future DOB, under-18, duplicate email — none of
    which has a matching model-level constraint) raised an uncaught
    rest_framework ValidationError there instead, crashing with a 500 rather
    than showing the error. Moving the same check into clean() fixes that:
    Django's own form-validation flow already knows what to do with
    self.add_error().
    """

    # Overrides the model field's own auto-generated (single-select) form
    # field — `specialization` is a comma-separated list on the model now
    # (see TechnicianProfile.specialization's own docstring), but the admin
    # should still offer/collect it as a set of checkboxes, one per
    # SPECIALIZATION_CHOICES entry, not a raw text box. MultipleChoiceField
    # both renders that widget and validates each individually-selected
    # value against `choices` on its own — the model field itself can't do
    # that validation anymore now that a valid stored value (e.g.
    # "ac,refrigerator") isn't itself one of the choice keys.
    specialization = forms.MultipleChoiceField(
        choices=TechnicianProfile.SPECIALIZATION_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        label='Service Specialization',
        help_text='Select every appliance category this technician can service.',
    )

    class Meta:
        model = TechnicianProfile
        exclude = ['user']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            # The model-derived initial (model_to_dict) would hand this
            # field the raw stored string ("ac,refrigerator") — a
            # MultipleChoiceField needs a list of keys instead to know
            # which boxes to pre-check on the edit form.
            self.initial['specialization'] = self.instance.specialization_list

    def clean(self):
        cleaned_data = super().clean()
        if self.errors:
            # Field-level errors (missing required fields, bad choices, ...)
            # already exist — don't also run cross-field/uniqueness checks
            # against data that's already known incomplete/invalid.
            return cleaned_data

        # Django's ModelForm always includes every field's key in
        # cleaned_data — including `profile_image` as `None` when nothing
        # was uploaded (add form) or left untouched (edit form), rather than
        # omitting the key. TechnicianSerializer's `profile_image` (an
        # ImageField matching the model column, which has no null=True — see
        # TechnicianProfile's own docstring on why not) accepts the key being
        # *absent* (required=False, from blank=True) but rejects an explicit
        # None with "This field may not be null." Only forward it when a
        # genuine new file was actually uploaded, so "no image yet" / "leave
        # the existing image alone" both correctly read as "not provided"
        # rather than "clear this to null."
        serializer_data = dict(cleaned_data)
        if not isinstance(serializer_data.get('profile_image'), UploadedFile):
            serializer_data.pop('profile_image', None)
        # cleaned_data['specialization'] is the list MultipleChoiceField
        # produced (e.g. ['ac', 'refrigerator']) — TechnicianSerializer's
        # own `specialization` is a plain CharField (the model column
        # underneath it), which expects the same comma-joined string form
        # the model stores, not a list.
        serializer_data['specialization'] = ','.join(cleaned_data.get('specialization', []))

        serializer = TechnicianSerializer(
            instance=self.instance if self.instance.pk else None,
            data=serializer_data,
            partial=self.instance.pk is not None,
        )
        if not serializer.is_valid():
            for field, errors in serializer.errors.items():
                if field in self.fields:
                    self.add_error(field, errors[0])
                else:
                    self.add_error(None, errors[0])
            return cleaned_data

        # Cached for TechnicianProfileAdmin.save_model below, so the exact
        # already-validated data (mobile_number/email normalized) gets
        # persisted rather than re-deriving/re-validating it a second time.
        self._technician_serializer = serializer
        return cleaned_data


class SpecializationListFilter(admin.SimpleListFilter):
    """A plain `list_filter = ('specialization', ...)` shows Django's
    default "every distinct value in the column" filter — with
    `specialization` now a comma-joined list (see its own docstring on
    TechnicianProfile), that would offer one option per distinct
    *combination* ("ac,refrigerator" as its own row, separate from "ac"
    alone) instead of one per actual appliance category, and wouldn't match
    a technician at all unless their stored value was exactly equal. This
    filters by comma-boundary-safe membership instead, so picking "AC"
    matches every technician who covers AC, regardless of what else they
    also cover or what order it's stored in.
    """

    title = 'specialization'
    parameter_name = 'specialization'

    def lookups(self, request, model_admin):
        return TechnicianProfile.SPECIALIZATION_CHOICES

    def queryset(self, request, queryset):
        value = self.value()
        if not value:
            return queryset
        # Matches `value` as a whole comma-delimited token — exactly equal
        # to the whole field, first, last, or somewhere in the middle of
        # the list — never as a mere substring of a different key (not a
        # concern with today's four fixed keys, but the fixed-set choices
        # are also what the widget itself always writes, so a future key
        # never needs a different check here).
        return queryset.filter(
            Q(specialization=value)
            | Q(specialization__startswith=f'{value},')
            | Q(specialization__endswith=f',{value}')
            | Q(specialization__contains=f',{value},')
        )


@admin.register(TechnicianProfile)
class TechnicianProfileAdmin(ModelAdmin):
    form = TechnicianProfileAdminForm
    list_display = (
        'name',
        'mobile_number',
        'email',
        'specialization_display_column',
        'experience_years',
        'is_active_display',
        'joining_date',
    )
    search_fields = ('name', 'email', 'mobile_number')
    list_filter = (SpecializationListFilter, 'user__is_active')
    readonly_fields = ('joining_date',)
    ordering = ('-joining_date',)
    actions = ['activate_technicians', 'deactivate_technicians']

    @admin.display(boolean=True, description='Active')
    def is_active_display(self, obj):
        return obj.is_active

    @admin.display(description='Specialization')
    def specialization_display_column(self, obj):
        # obj.specialization_display (TechnicianProfile's own property) —
        # human-readable labels ("AC, Refrigerator"), not the raw
        # comma-separated keys the column would otherwise show.
        return obj.specialization_display

    def save_model(self, request, obj, form, change):
        # form.clean() (TechnicianProfileAdminForm above) already validated
        # via TechnicianSerializer and cached the ready-to-save instance —
        # this just calls .save() on it, so the actual persistence (and its
        # User-creation/username-sync side effects) is the exact same code
        # path the admin-only API uses, not a second copy of it here.
        technician = form._technician_serializer.save()
        if not change:
            # Django Admin's own `obj` is a separate, still-unsaved instance
            # from the one TechnicianSerializer.create() actually persists
            # (it creates the User first, then the TechnicianProfile) —
            # mirror the real row's identity onto it so Admin's own
            # post-save redirect/success message (which reads obj.pk)
            # points at the technician that actually exists.
            obj.pk = technician.pk
            obj.user_id = technician.user_id

    @admin.action(description='Activate selected technicians')
    def activate_technicians(self, request, queryset):
        get_user_model().objects.filter(pk__in=queryset.values_list('user_id', flat=True)).update(is_active=True)

    @admin.action(description='Deactivate selected technicians')
    def deactivate_technicians(self, request, queryset):
        get_user_model().objects.filter(pk__in=queryset.values_list('user_id', flat=True)).update(is_active=False)


class UserProfileInline(admin.StackedInline):
    """Shown on UserAdmin's own change page so an admin can see — or, for an
    account with no dedicated Customer/TechnicianProfile row yet, set —
    this user's role without leaving the User screen. The per-role data
    itself (Customer/TechnicianProfile/Address) still lives in, and is
    managed from, their own dedicated admin pages."""

    model = UserProfile
    can_delete = False
    extra = 0
    verbose_name_plural = 'Role'


# django.contrib.auth's built-in User/Group admins predate Unfold and don't
# use its ModelAdmin base, so left alone they'd render as plain Django admin
# in the middle of an otherwise Unfold-themed site. Re-registering them here
# with Unfold's forms is the pattern Unfold's own docs recommend:
# https://unfoldadmin.com/docs/integrations/django-auth/
admin.site.unregister(User)
admin.site.unregister(Group)


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm
    inlines = [UserProfileInline]
    list_filter = BaseUserAdmin.list_filter + ('role_profile__role',)

    @admin.display(description='Role')
    def role_display(self, obj):
        return getattr(getattr(obj, 'role_profile', None), 'get_role_display', lambda: '—')()

    list_display = BaseUserAdmin.list_display + ('role_display',)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass
