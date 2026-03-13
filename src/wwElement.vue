<template>
  <div v-if="!content.portalTarget || content.portalTarget === 'admin'" class="spread-ds">
    <!-- Gate overlay -->
    <div v-if="!content.accessToken || !content.userId" class="spread-ds__gate">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <p class="spread-ds__gate-text">Admin access required</p>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="spread-ds__header">
        <div>
          <h2 class="spread-ds__title">Dispatch Settings</h2>
          <p class="spread-ds__subtitle">Configure when orders are dispatched to customers</p>
        </div>
        <div v-if="loading" class="spread-ds__spinner" aria-label="Loading"></div>
      </div>

      <!-- Read-only banner -->
      <div v-if="!canEdit" class="spread-ds__readonly-banner">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        You have read-only access to dispatch settings.
      </div>

      <!-- Error -->
      <div v-if="error" class="spread-ds__error" role="alert">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ error }}
      </div>

      <!-- Success toast -->
      <transition name="spread-ds-toast">
        <div v-if="toast" class="spread-ds__toast" role="status">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          {{ toast }}
        </div>
      </transition>

      <div class="spread-ds__cards">
        <!-- ── Card 1: Dispatch Schedule ─────────────────────────────── -->
        <div class="spread-ds__card">
          <h3 class="spread-ds__card-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Dispatch Schedule
          </h3>

          <!-- Day of week -->
          <div class="spread-ds__field">
            <label class="spread-ds__label">Dispatch day</label>
            <div class="spread-ds__day-grid" role="group" aria-label="Day of week">
              <button
                v-for="d in DAYS"
                :key="d.value"
                class="spread-ds__day-btn"
                :class="{ 'spread-ds__day-btn--active': form.day_of_week === d.value }"
                :disabled="!canEdit || savingKey === 'dispatch.day_of_week'"
                @click="selectDay(d.value)"
                :aria-pressed="form.day_of_week === d.value"
              >{{ d.short }}</button>
            </div>
            <p class="spread-ds__field-hint" v-if="settings['dispatch.day_of_week']">Last updated: {{ formatTs(settings['dispatch.day_of_week']?.updated_at) }}</p>
          </div>

          <!-- Cutoff hours -->
          <div class="spread-ds__field">
            <label class="spread-ds__label" for="cutoffHours">Order cutoff (hours before dispatch)</label>
            <div class="spread-ds__input-row">
              <input
                id="cutoffHours"
                class="spread-ds__input spread-ds__input--sm"
                type="number" min="1" max="168"
                v-model.number="form.cutoff_hours"
                :disabled="!canEdit"
                @change="saveSetting('dispatch.cutoff_hours', form.cutoff_hours)"
              />
              <span class="spread-ds__input-suffix">hours</span>
              <div v-if="savingKey === 'dispatch.cutoff_hours'" class="spread-ds__inline-spinner"></div>
            </div>
          </div>

          <!-- Preview -->
          <div class="spread-ds__preview-box">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>{{ schedulePreview }}</span>
          </div>
        </div>

        <!-- ── Card 2: Customer Messaging ─────────────────────────────── -->
        <div class="spread-ds__card">
          <h3 class="spread-ds__card-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Customer Messaging
          </h3>

          <div class="spread-ds__field">
            <label class="spread-ds__label" for="dispatchMessage">Dispatch confirmation message</label>
            <p class="spread-ds__field-hint">Sent to customers when their order is dispatched. Max 280 characters.</p>
            <textarea
              id="dispatchMessage"
              class="spread-ds__textarea"
              rows="4" maxlength="280"
              v-model="form.dispatch_message"
              :disabled="!canEdit"
              @blur="saveSetting('dispatch.message', form.dispatch_message)"
              placeholder="Your Spread order is on its way! 🚚"
            ></textarea>
            <div class="spread-ds__char-row">
              <span class="spread-ds__char-count" :class="{ 'spread-ds__char-count--warn': form.dispatch_message.length > 250 }">
                {{ form.dispatch_message.length }}/280
              </span>
              <div v-if="savingKey === 'dispatch.message'" class="spread-ds__inline-spinner"></div>
            </div>
          </div>

          <!-- Preview -->
          <div class="spread-ds__msg-preview">
            <p class="spread-ds__msg-preview-label">Preview</p>
            <div class="spread-ds__msg-bubble">
              {{ form.dispatch_message || 'Your Spread order is on its way! 🚚' }}
            </div>
          </div>
        </div>

        <!-- ── Card 3: Next Cycle Override ────────────────────────────── -->
        <div class="spread-ds__card">
          <h3 class="spread-ds__card-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Next Cycle Override
          </h3>
          <p class="spread-ds__card-desc">Override the computed next dispatch date for this cycle only. Clear to revert to the schedule above.</p>

          <div class="spread-ds__field">
            <label class="spread-ds__label" for="overrideDate">Override date</label>
            <div class="spread-ds__input-row">
              <input
                id="overrideDate"
                class="spread-ds__input"
                type="date"
                v-model="form.next_cycle_override"
                :disabled="!canEdit"
                @change="saveSetting('dispatch.next_cycle_override', form.next_cycle_override || null)"
              />
              <button
                v-if="form.next_cycle_override"
                class="spread-ds__clear-btn"
                :disabled="!canEdit"
                @click="clearOverride"
              >Clear</button>
              <div v-if="savingKey === 'dispatch.next_cycle_override'" class="spread-ds__inline-spinner"></div>
            </div>
          </div>

          <div v-if="form.next_cycle_override" class="spread-ds__preview-box spread-ds__preview-box--warning">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Next cycle is overridden to {{ formatDate(form.next_cycle_override) }}
          </div>
        </div>

        <!-- ── Card 4: Digest Notifications ─────────────────────────── -->
        <div class="spread-ds__card spread-ds__card--full">
          <h3 class="spread-ds__card-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Digest Notifications
          </h3>
          <p class="spread-ds__card-desc">Enable automated order digest emails. Each period sends to Make via its own webhook. Only periods with a configured webhook will actually dispatch.</p>

          <!-- Error (digest-scoped) -->
          <div v-if="digestError" class="spread-ds__error" role="alert">
            {{ digestError }}
          </div>

          <!-- Daily -->
          <div class="spread-ds__digest-row">
            <div class="spread-ds__digest-row-left">
              <label class="spread-ds__toggle-wrap" :for="'toggle-daily'" :aria-label="'Enable daily digest'">
                <input
                  id="toggle-daily"
                  type="checkbox"
                  class="spread-ds__toggle-input"
                  :checked="digestForm.daily_enabled"
                  :disabled="!canEdit || savingKey === 'digest.daily_enabled'"
                  @change="saveDigestSetting('digest.daily_enabled', $event.target.checked)"
                />
                <span class="spread-ds__toggle-pill"></span>
              </label>
              <div class="spread-ds__digest-label">
                <span class="spread-ds__digest-period">Daily</span>
                <span class="spread-ds__digest-hint">08:00 AEST every morning</span>
              </div>
            </div>
            <div v-if="savingKey === 'digest.daily_enabled'" class="spread-ds__inline-spinner"></div>
          </div>
          <div class="spread-ds__digest-webhook" v-if="digestForm.daily_enabled">
            <label class="spread-ds__label" for="webhook-daily">Make webhook URL (daily)</label>
            <div class="spread-ds__input-row">
              <input
                id="webhook-daily"
                class="spread-ds__input"
                type="url"
                placeholder="https://hook.eu2.make.com/…"
                v-model="digestForm.webhook_daily"
                :disabled="!canEdit"
                @blur="saveDigestSetting('notif_webhook_order_digest', digestForm.webhook_daily)"
              />
              <div v-if="savingKey === 'notif_webhook_order_digest'" class="spread-ds__inline-spinner"></div>
            </div>
            <p v-if="digestSettings['notif_webhook_order_digest']" class="spread-ds__field-hint">Last updated: {{ formatTs(digestSettings['notif_webhook_order_digest']?.updated_at) }}</p>
          </div>

          <!-- Weekly -->
          <div class="spread-ds__digest-row">
            <div class="spread-ds__digest-row-left">
              <label class="spread-ds__toggle-wrap" :for="'toggle-weekly'" :aria-label="'Enable weekly digest'">
                <input
                  id="toggle-weekly"
                  type="checkbox"
                  class="spread-ds__toggle-input"
                  :checked="digestForm.weekly_enabled"
                  :disabled="!canEdit || savingKey === 'digest.weekly_enabled'"
                  @change="saveDigestSetting('digest.weekly_enabled', $event.target.checked)"
                />
                <span class="spread-ds__toggle-pill"></span>
              </label>
              <div class="spread-ds__digest-label">
                <span class="spread-ds__digest-period">Weekly</span>
                <span class="spread-ds__digest-hint">Monday 08:00 AEST — covers prior Mon–Sun</span>
              </div>
            </div>
            <div v-if="savingKey === 'digest.weekly_enabled'" class="spread-ds__inline-spinner"></div>
          </div>
          <div class="spread-ds__digest-webhook" v-if="digestForm.weekly_enabled">
            <label class="spread-ds__label" for="webhook-weekly">Make webhook URL (weekly)</label>
            <div class="spread-ds__input-row">
              <input
                id="webhook-weekly"
                class="spread-ds__input"
                type="url"
                placeholder="https://hook.eu2.make.com/…"
                v-model="digestForm.webhook_weekly"
                :disabled="!canEdit"
                @blur="saveDigestSetting('notif_webhook_weekly_digest', digestForm.webhook_weekly)"
              />
              <div v-if="savingKey === 'notif_webhook_weekly_digest'" class="spread-ds__inline-spinner"></div>
            </div>
            <p v-if="digestSettings['notif_webhook_weekly_digest']" class="spread-ds__field-hint">Last updated: {{ formatTs(digestSettings['notif_webhook_weekly_digest']?.updated_at) }}</p>
          </div>

          <!-- Monthly -->
          <div class="spread-ds__digest-row">
            <div class="spread-ds__digest-row-left">
              <label class="spread-ds__toggle-wrap" :for="'toggle-monthly'" :aria-label="'Enable monthly digest'">
                <input
                  id="toggle-monthly"
                  type="checkbox"
                  class="spread-ds__toggle-input"
                  :checked="digestForm.monthly_enabled"
                  :disabled="!canEdit || savingKey === 'digest.monthly_enabled'"
                  @change="saveDigestSetting('digest.monthly_enabled', $event.target.checked)"
                />
                <span class="spread-ds__toggle-pill"></span>
              </label>
              <div class="spread-ds__digest-label">
                <span class="spread-ds__digest-period">Monthly</span>
                <span class="spread-ds__digest-hint">2nd of month 08:00 AEST — covers prior calendar month</span>
              </div>
            </div>
            <div v-if="savingKey === 'digest.monthly_enabled'" class="spread-ds__inline-spinner"></div>
          </div>
          <div class="spread-ds__digest-webhook" v-if="digestForm.monthly_enabled">
            <label class="spread-ds__label" for="webhook-monthly">Make webhook URL (monthly)</label>
            <div class="spread-ds__input-row">
              <input
                id="webhook-monthly"
                class="spread-ds__input"
                type="url"
                placeholder="https://hook.eu2.make.com/…"
                v-model="digestForm.webhook_monthly"
                :disabled="!canEdit"
                @blur="saveDigestSetting('notif_webhook_monthly_digest', digestForm.webhook_monthly)"
              />
              <div v-if="savingKey === 'notif_webhook_monthly_digest'" class="spread-ds__inline-spinner"></div>
            </div>
            <p v-if="digestSettings['notif_webhook_monthly_digest']" class="spread-ds__field-hint">Last updated: {{ formatTs(digestSettings['notif_webhook_monthly_digest']?.updated_at) }}</p>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script>
/* ── Mock ──────────────────────────────────────────────────────────────── */
const MOCK_SETTINGS = {
  'dispatch.day_of_week':          { value: 'wednesday', updated_at: new Date().toISOString() },
  'dispatch.cutoff_hours':         { value: 48,          updated_at: new Date().toISOString() },
  'dispatch.message':              { value: "Your Spread order is on its way! 🚚", updated_at: new Date().toISOString() },
  'dispatch.next_cycle_override':  { value: null,        updated_at: new Date().toISOString() },
};
const MOCK_DIGEST_SETTINGS = {
  'digest.daily_enabled':           { value: true,  updated_at: new Date().toISOString() },
  'digest.weekly_enabled':          { value: false, updated_at: new Date().toISOString() },
  'digest.monthly_enabled':         { value: false, updated_at: new Date().toISOString() },
  'notif_webhook_order_digest':     { value: '',    updated_at: new Date().toISOString() },
  'notif_webhook_weekly_digest':    { value: '',    updated_at: new Date().toISOString() },
  'notif_webhook_monthly_digest':   { value: '',    updated_at: new Date().toISOString() },
};
const DAYS = [
  { value: 'monday',    short: 'Mon' },
  { value: 'tuesday',   short: 'Tue' },
  { value: 'wednesday', short: 'Wed' },
  { value: 'thursday',  short: 'Thu' },
  { value: 'friday',    short: 'Fri' },
  { value: 'saturday',  short: 'Sat' },
  { value: 'sunday',    short: 'Sun' },
];

/* ── Inline Supabase client ────────────────────────────────────────────── */
function createSpreadClient(url, anonKey, token) {
  const headers = { 'Content-Type': 'application/json', apikey: anonKey };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return {
    async rpc(fn, params = {}) {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(params) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || res.statusText); }
      return res.json();
    },
  };
}

export default {
  props: {
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
    content:        { type: Object, required: true },
    wwFrontState:   { type: Object, required: true },
    wwElementState: { type: Object, required: true },
  },
  emits: ['trigger-event', 'update:content'],

  data() {
    return {
      DAYS,
      loading:     false,
      canEdit:     false,
      error:       null,
      toast:       null,
      _toastTimer: null,
      savingKey:   null,
      settings:    {},
      form: {
        day_of_week:         'wednesday',
        cutoff_hours:        48,
        dispatch_message:    '',
        next_cycle_override: '',
      },
      // Digest notification settings
      digestSettings:  {},
      digestError:     null,
      digestForm: {
        daily_enabled:   true,
        weekly_enabled:  false,
        monthly_enabled: false,
        webhook_daily:   '',
        webhook_weekly:  '',
        webhook_monthly: '',
      },
    };
  },

  computed: {
    /* wwEditor:start */
    isEditorMode() { return !!this.wwEditorState; },
    /* wwEditor:end */
    schedulePreview() {
      const day = this.form.day_of_week || 'wednesday';
      const h   = this.form.cutoff_hours || 48;
      const cap = day.charAt(0).toUpperCase() + day.slice(1);
      const cutoffDay = this.subtractHoursDay(day, h);
      return `Orders dispatched every ${cap}. Cutoff is ${cutoffDay} (~${h}h before).`;
    },
  },

  watch: {
    'content.refreshTrigger'() { this.loadSettings(); },
  },

  mounted() {
    /* wwEditor:start */
    if (this.isEditorMode) {
      this.settings        = MOCK_SETTINGS;
      this.digestSettings  = MOCK_DIGEST_SETTINGS;
      this.canEdit         = true;
      this.applyToForm(MOCK_SETTINGS);
      this.applyDigestToForm(MOCK_DIGEST_SETTINGS);
      return;
    }
    /* wwEditor:end */
    this.loadSettings();
  },

  methods: {
    client() {
      return createSpreadClient(this.content?.supabaseUrl, this.content?.supabaseAnonKey, this.content?.accessToken);
    },

    async loadSettings() {
      if (!this.content.accessToken || !this.content.userId) return;
      this.loading = true;
      this.error   = null;
      const c = this.client();
      const [settingsRes, permRes, digestRes] = await Promise.allSettled([
        c.rpc('get_dispatch_settings', { p_user_id: this.content.userId }),
        c.rpc('has_permission', { p_user_id: this.content.userId, p_permission_key: 'platform.settings.manage', p_scope_type: 'global', p_scope_id: null }),
        c.rpc('get_digest_settings', { p_user_id: this.content.userId }),
      ]);
      if (settingsRes.status === 'fulfilled' && settingsRes.value) {
        this.settings = settingsRes.value;
        this.applyToForm(settingsRes.value);
      } else if (settingsRes.status === 'rejected') {
        this.error = settingsRes.reason?.message || 'Failed to load settings';
      }
      if (permRes.status === 'fulfilled') this.canEdit = !!(permRes.value);
      if (digestRes.status === 'fulfilled' && digestRes.value) {
        this.digestSettings = digestRes.value;
        this.applyDigestToForm(digestRes.value);
      }
      this.loading = false;
    },

    applyDigestToForm(s) {
      this.digestForm.daily_enabled   = !!(s['digest.daily_enabled']?.value   ?? true);
      this.digestForm.weekly_enabled  = !!(s['digest.weekly_enabled']?.value  ?? false);
      this.digestForm.monthly_enabled = !!(s['digest.monthly_enabled']?.value ?? false);
      this.digestForm.webhook_daily   = s['notif_webhook_order_digest']?.value     || '';
      this.digestForm.webhook_weekly  = s['notif_webhook_weekly_digest']?.value    || '';
      this.digestForm.webhook_monthly = s['notif_webhook_monthly_digest']?.value   || '';
    },

    async saveDigestSetting(key, value) {
      if (!this.canEdit) return;
      this.savingKey   = key;
      this.digestError = null;
      try {
        const result = await this.client().rpc('update_digest_settings', {
          p_user_id: this.content.userId,
          p_key:     key,
          p_value:   value === null || value === '' ? null : JSON.parse(JSON.stringify(value)),
        });
        // Refresh local digestSettings cache so timestamps update
        if (result) this.digestSettings[key] = result;
        this.showToast('Saved');
        this.$emit('trigger-event', { name: 'digest:saved', event: { key, value } });
      } catch (e) {
        this.digestError = e.message || 'Save failed';
        this.$emit('trigger-event', { name: 'digest:error', event: { message: this.digestError } });
      } finally {
        this.savingKey = null;
      }
    },

    applyToForm(settings) {
      this.form.day_of_week         = settings['dispatch.day_of_week']?.value         || 'wednesday';
      this.form.cutoff_hours        = settings['dispatch.cutoff_hours']?.value        ?? 48;
      this.form.dispatch_message    = settings['dispatch.message']?.value             || '';
      this.form.next_cycle_override = settings['dispatch.next_cycle_override']?.value || '';
    },

    async saveSetting(key, value) {
      if (!this.canEdit) return;
      this.savingKey = key;
      this.error     = null;
      try {
        await this.client().rpc('update_dispatch_settings', {
          p_user_id: this.content.userId,
          p_key:     key,
          p_value:   value === null || value === '' ? null : JSON.parse(JSON.stringify(value)),
        });
        this.showToast(`Saved`);
        this.$emit('trigger-event', { name: 'dispatch:saved', event: { key, value } });
      } catch (e) {
        this.error = e.message || 'Save failed';
        this.$emit('trigger-event', { name: 'dispatch:error', event: { message: this.error } });
      } finally {
        this.savingKey = null;
      }
    },

    selectDay(value) {
      if (!this.canEdit) return;
      this.form.day_of_week = value;
      this.saveSetting('dispatch.day_of_week', value);
    },

    clearOverride() {
      this.form.next_cycle_override = '';
      this.saveSetting('dispatch.next_cycle_override', null);
    },

    showToast(msg) {
      this.toast = msg;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { this.toast = null; }, 2800);
    },

    formatTs(ts) {
      if (!ts) return '';
      try { return new Date(ts).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (_) { return ts; }
    },

    formatDate(str) {
      try { return new Date(str).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch (_) { return str; }
    },

    subtractHoursDay(dayOfWeek, hours) {
      const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const idx  = days.indexOf(dayOfWeek);
      if (idx === -1) return '';
      const cutoff = new Date(0);
      cutoff.setDate(cutoff.getDate() + idx);
      cutoff.setHours(cutoff.getHours() - hours);
      return cutoff.toLocaleDateString('en-AU', { weekday: 'long' });
    },
  },
};
</script>

<style scoped>
.spread-ds {
  --spread-primary:      #4B162D;
  --spread-accent:       #CE6632;
  --spread-dark-grey:    #2B2B2B;
  --spread-mid-grey:     #4B5563;
  --spread-light-grey:   #6B7280;
  --spread-border:       #F3EADF;
  --spread-background:   #FBFAF8;
  --spread-success:      #16A34A;
  --spread-warning:      #D97706;
  --spread-error:        #D14343;
  --spread-radius:       12px;
  --spread-radius-sm:    8px;
  --spread-font:         ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;

  font-family: var(--spread-font);
  width: 100%;
  box-sizing: border-box;
  padding: 1.5rem;
  background: var(--spread-background);
}

.spread-ds *,
.spread-ds *::before,
.spread-ds *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Gate */
.spread-ds__gate {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; min-height: 200px; color: var(--spread-mid-grey);
}
.spread-ds__gate-text { font-size: 14px; font-weight: 500; }

/* Header */
.spread-ds__header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
.spread-ds__title { font-size: 1.375rem; font-weight: 800; color: var(--spread-primary); }
.spread-ds__subtitle { font-size: 0.8125rem; color: var(--spread-light-grey); margin-top: 2px; }

/* Banners */
.spread-ds__readonly-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: var(--spread-radius-sm);
  color: #1E40AF; font-size: 13px; margin-bottom: 1rem;
}
.spread-ds__error {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--spread-radius-sm);
  color: var(--spread-error); font-size: 13px; margin-bottom: 1rem;
}
.spread-ds__toast {
  position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; background: var(--spread-dark-grey); color: #fff;
  border-radius: var(--spread-radius-sm); font-size: 13px; font-weight: 500;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.spread-ds-toast-enter-active { animation: spread-ds-slide-up 0.2s ease; }
.spread-ds-toast-leave-active { animation: spread-ds-slide-up 0.2s ease reverse; }
@keyframes spread-ds-slide-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* Cards layout */
.spread-ds__cards { display: flex; flex-direction: column; gap: 1rem; }
@media (min-width: 768px) { .spread-ds__cards { display: grid; grid-template-columns: 1fr 1fr; } }
@media (min-width: 1200px) { .spread-ds__cards { grid-template-columns: 1fr 1fr 1fr; } }

.spread-ds__card {
  background: #fff; border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius); padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
}
.spread-ds__card-title {
  font-size: 0.9375rem; font-weight: 700; color: var(--spread-dark-grey);
  display: flex; align-items: center; gap: 8px;
}
.spread-ds__card-desc { font-size: 12.5px; color: var(--spread-light-grey); line-height: 1.5; }

/* Fields */
.spread-ds__field { display: flex; flex-direction: column; gap: 6px; }
.spread-ds__label { font-size: 12.5px; font-weight: 600; color: var(--spread-mid-grey); }
.spread-ds__field-hint { font-size: 11.5px; color: var(--spread-light-grey); }

/* Day grid */
.spread-ds__day-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.spread-ds__day-btn {
  padding: 7px 4px; font-size: 11px; font-weight: 600;
  background: var(--spread-background); border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius-sm); cursor: pointer; transition: all 0.12s; color: var(--spread-mid-grey);
  text-align: center;
}
.spread-ds__day-btn:hover:not(:disabled) { border-color: var(--spread-accent); color: var(--spread-accent); }
.spread-ds__day-btn--active { background: var(--spread-primary); border-color: var(--spread-primary); color: #fff; }
.spread-ds__day-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Inputs */
.spread-ds__input-row { display: flex; align-items: center; gap: 8px; }
.spread-ds__input {
  flex: 1; padding: 9px 12px; background: var(--spread-background);
  border: 1px solid var(--spread-border); border-radius: var(--spread-radius-sm);
  font-size: 14px; color: var(--spread-dark-grey); outline: none; transition: border-color 0.15s;
  font-family: inherit;
}
.spread-ds__input:focus { border-color: var(--spread-accent); }
.spread-ds__input:disabled { opacity: 0.6; cursor: not-allowed; }
.spread-ds__input--sm { max-width: 90px; }
.spread-ds__input-suffix { font-size: 13px; color: var(--spread-light-grey); white-space: nowrap; }

.spread-ds__clear-btn {
  padding: 8px 14px; background: none; border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius-sm); font-size: 13px; cursor: pointer;
  color: var(--spread-mid-grey); transition: all 0.12s;
}
.spread-ds__clear-btn:hover:not(:disabled) { border-color: var(--spread-error); color: var(--spread-error); }
.spread-ds__clear-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Textarea */
.spread-ds__textarea {
  width: 100%; padding: 10px 12px; background: var(--spread-background);
  border: 1px solid var(--spread-border); border-radius: var(--spread-radius-sm);
  font-size: 14px; color: var(--spread-dark-grey); outline: none; resize: vertical;
  font-family: inherit; line-height: 1.5; transition: border-color 0.15s;
}
.spread-ds__textarea:focus { border-color: var(--spread-accent); }
.spread-ds__textarea:disabled { opacity: 0.6; cursor: not-allowed; }
.spread-ds__char-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.spread-ds__char-count { font-size: 11px; color: var(--spread-light-grey); }
.spread-ds__char-count--warn { color: var(--spread-warning); }

/* Preview */
.spread-ds__preview-box {
  display: flex; align-items: flex-start; gap: 7px;
  padding: 10px 12px; background: var(--spread-background); border: 1px solid var(--spread-border);
  border-radius: var(--spread-radius-sm); font-size: 12.5px; color: var(--spread-mid-grey); line-height: 1.4;
}
.spread-ds__preview-box--warning { background: #FFFBEB; border-color: #FDE68A; color: #92400E; }

/* Message preview */
.spread-ds__msg-preview { display: flex; flex-direction: column; gap: 6px; }
.spread-ds__msg-preview-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--spread-light-grey); }
.spread-ds__msg-bubble {
  background: #DCFCE7; border-radius: 14px 14px 2px 14px;
  padding: 10px 14px; font-size: 13px; color: var(--spread-dark-grey); line-height: 1.5;
  max-width: 80%; word-break: break-word;
}

/* Spinners */
.spread-ds__spinner {
  width: 20px; height: 20px; border: 2px solid var(--spread-border);
  border-top-color: var(--spread-accent); border-radius: 50%;
  animation: spread-ds-spin 0.6s linear infinite; flex-shrink: 0;
}
.spread-ds__inline-spinner {
  width: 14px; height: 14px; border: 2px solid var(--spread-border);
  border-top-color: var(--spread-accent); border-radius: 50%;
  animation: spread-ds-spin 0.6s linear infinite; flex-shrink: 0;
}
@keyframes spread-ds-spin { to { transform: rotate(360deg); } }

/* Full-width card variant (digest card spans all columns) */
@media (min-width: 768px) {
  .spread-ds__card--full { grid-column: 1 / -1; }
}

/* Digest rows */
.spread-ds__digest-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 0; border-bottom: 1px solid var(--spread-border);
}
.spread-ds__digest-row:first-of-type { padding-top: 4px; }
.spread-ds__digest-row-left { display: flex; align-items: center; gap: 12px; }
.spread-ds__digest-label { display: flex; flex-direction: column; gap: 2px; }
.spread-ds__digest-period { font-size: 13.5px; font-weight: 600; color: var(--spread-dark-grey); }
.spread-ds__digest-hint { font-size: 11.5px; color: var(--spread-light-grey); }
.spread-ds__digest-webhook {
  padding: 10px 0 14px 0; border-bottom: 1px solid var(--spread-border);
}

/* Toggle switch — pill style */
.spread-ds__toggle-wrap {
  position: relative; display: inline-flex; align-items: center;
  cursor: pointer; flex-shrink: 0;
}
.spread-ds__toggle-wrap[disabled],
.spread-ds__toggle-input:disabled + .spread-ds__toggle-pill { opacity: 0.5; cursor: not-allowed; }
.spread-ds__toggle-input {
  position: absolute; width: 1px; height: 1px;
  opacity: 0; pointer-events: none;
}
.spread-ds__toggle-pill {
  width: 40px; height: 22px; background: var(--spread-border);
  border-radius: 999px; transition: background 0.2s ease;
  display: flex; align-items: center; padding: 2px;
  flex-shrink: 0;
}
.spread-ds__toggle-pill::after {
  content: ''; width: 18px; height: 18px; background: #fff;
  border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: transform 0.2s ease;
}
.spread-ds__toggle-input:checked + .spread-ds__toggle-pill {
  background: var(--spread-accent);
}
.spread-ds__toggle-input:checked + .spread-ds__toggle-pill::after {
  transform: translateX(18px);
}
.spread-ds__toggle-input:focus-visible + .spread-ds__toggle-pill {
  outline: 2px solid var(--spread-accent); outline-offset: 2px;
}
</style>
