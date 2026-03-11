export default {
  editor: {
    label: { en: 'Admin Dispatch Settings' },
    icon: 'truck',
    categories: ['data'],
    deprecated: false,
  },
  properties: {
    supabaseUrl: {
      label: { en: 'Supabase URL' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    supabaseAnonKey: {
      label: { en: 'Supabase Anon Key' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    accessToken: {
      label: { en: 'Auth Token' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    userId: {
      label: { en: 'User ID' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
    refreshTrigger: {
      label: { en: 'Refresh Trigger' },
      type: 'Text',
      bindable: true,
      hidden: true,
      defaultValue: '',
    },
  },
  triggerEvents: [
    {
      name: 'dispatchsettings:saved',
      label: { en: 'On Settings Saved' },
      event: { key: '', value: '' },
    },
    {
      name: 'dispatchsettings:error',
      label: { en: 'On Error' },
      event: { message: '' },
    },
  ],
};
