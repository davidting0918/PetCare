import React, { useState } from 'react';
import {
  X,
  Globe,
  Palette,
  Scale,
  Clock,
  Calendar,
  Save,
  RefreshCw,
  Eye,
  Moon,
  Sun
} from 'lucide-react';

interface AppPreferencesModalProps {
  onClose: () => void;
}

interface AppPreferences {
  language: string;
  region: string;
  units: {
    weight: 'kg' | 'lbs';
    temperature: 'celsius' | 'fahrenheit';
    volume: 'ml' | 'oz';
    distance: 'km' | 'miles';
  };
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  theme: 'light' | 'dark' | 'auto';
  accessibility: {
    largeText: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
  };
  privacy: {
    analyticsEnabled: boolean;
    crashReporting: boolean;
    marketingEmails: boolean;
    usageData: boolean;
  };
  autoSync: {
    enabled: boolean;
    frequency: 'realtime' | 'hourly' | 'daily';
    wifiOnly: boolean;
  };
  defaultViews: {
    dashboard: 'summary' | 'detailed';
    mealHistory: '7days' | '30days' | '90days';
    weightChart: '30days' | '90days' | '6months';
  };
}

export const AppPreferencesModal: React.FC<AppPreferencesModalProps> = ({
  onClose
}) => {
  const [preferences, setPreferences] = useState<AppPreferences>({
    language: 'zh-TW',
    region: 'TW',
    units: {
      weight: 'kg',
      temperature: 'celsius',
      volume: 'ml',
      distance: 'km'
    },
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'TWD',
    theme: 'light',
    accessibility: {
      largeText: false,
      highContrast: false,
      reducedMotion: false,
      screenReader: false
    },
    privacy: {
      analyticsEnabled: true,
      crashReporting: true,
      marketingEmails: false,
      usageData: true
    },
    autoSync: {
      enabled: true,
      frequency: 'hourly',
      wifiOnly: false
    },
    defaultViews: {
      dashboard: 'summary',
      mealHistory: '7days',
      weightChart: '30days'
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const updatePreference = (category: keyof AppPreferences, field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [category]: typeof prev[category] === 'object' ? {
        ...prev[category] as any,
        [field]: value
      } : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Here you would save preferences to API and local storage
      console.log('Saving app preferences:', preferences);
      await new Promise(resolve => setTimeout(resolve, 1000));
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Reset all preferences to default values?')) {
      setPreferences({
        language: 'zh-TW',
        region: 'TW',
        units: {
          weight: 'kg',
          temperature: 'celsius',
          volume: 'ml',
          distance: 'km'
        },
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        currency: 'TWD',
        theme: 'light',
        accessibility: {
          largeText: false,
          highContrast: false,
          reducedMotion: false,
          screenReader: false
        },
        privacy: {
          analyticsEnabled: true,
          crashReporting: true,
          marketingEmails: false,
          usageData: true
        },
        autoSync: {
          enabled: true,
          frequency: 'hourly',
          wifiOnly: false
        },
        defaultViews: {
          dashboard: 'summary',
          mealHistory: '7days',
          weightChart: '30days'
        }
      });
    }
  };

  const languages = [
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en-US', name: 'English' },
    { code: 'ja-JP', name: '日本語' },
    { code: 'ko-KR', name: '한국어' }
  ];

  const regions = [
    { code: 'TW', name: 'Taiwan' },
    { code: 'CN', name: 'China' },
    { code: 'US', name: 'United States' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' }
  ];

  const currencies = [
    { code: 'TWD', name: 'TWD (NT$)', symbol: 'NT$' },
    { code: 'USD', name: 'USD ($)', symbol: '$' },
    { code: 'CNY', name: 'CNY (¥)', symbol: '¥' },
    { code: 'JPY', name: 'JPY (¥)', symbol: '¥' },
    { code: 'KRW', name: 'KRW (₩)', symbol: '₩' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden shadow-3d flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-3d flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">App Preferences</h2>
            <div className="flex space-x-2">
              <button
                onClick={resetToDefaults}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Reset to defaults"
              >
                <RefreshCw className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Language & Region */}
          <div className="card-3d p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Globe className="w-4 h-4 mr-2 text-orange" />
              Language & Region
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Language
                </label>
                <select
                  value={preferences.language}
                  onChange={(e) => updatePreference('language', '', e.target.value)}
                  className="input-3d w-full text-sm"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  value={preferences.region}
                  onChange={(e) => updatePreference('region', '', e.target.value)}
                  className="input-3d w-full text-sm"
                >
                  {regions.map(region => (
                    <option key={region.code} value={region.code}>{region.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={preferences.currency}
                  onChange={(e) => updatePreference('currency', '', e.target.value)}
                  className="input-3d w-full text-sm"
                >
                  {currencies.map(currency => (
                    <option key={currency.code} value={currency.code}>{currency.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Units & Formats */}
          <div className="card-3d p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Scale className="w-4 h-4 mr-2 text-mint" />
              Units & Formats
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <select
                    value={preferences.units.weight}
                    onChange={(e) => updatePreference('units', 'weight', e.target.value)}
                    className="input-3d w-full text-sm"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="lbs">Pounds (lbs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
                  <select
                    value={preferences.units.volume}
                    onChange={(e) => updatePreference('units', 'volume', e.target.value)}
                    className="input-3d w-full text-sm"
                  >
                    <option value="ml">Milliliters (ml)</option>
                    <option value="oz">Fluid Ounces (oz)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                  <select
                    value={preferences.dateFormat}
                    onChange={(e) => updatePreference('dateFormat', '', e.target.value)}
                    className="input-3d w-full text-sm"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                  <select
                    value={preferences.timeFormat}
                    onChange={(e) => updatePreference('timeFormat', '', e.target.value)}
                    className="input-3d w-full text-sm"
                  >
                    <option value="24h">24 Hour</option>
                    <option value="12h">12 Hour (AM/PM)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="card-3d p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Palette className="w-4 h-4 mr-2 text-earth" />
              Appearance
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'auto', label: 'Auto', icon: Eye }
                  ].map(theme => {
                    const IconComponent = theme.icon;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => updatePreference('theme', '', theme.id)}
                        className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                          preferences.theme === theme.id
                            ? 'btn-3d btn-3d-mint text-gray-700'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                        }`}
                      >
                        <IconComponent className="w-4 h-4 mx-auto mb-1" />
                        {theme.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Accessibility */}
          <div className="card-3d p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Eye className="w-4 h-4 mr-2 text-orange" />
              Accessibility
            </h3>
            <div className="space-y-2">
              {Object.entries({
                largeText: 'Larger text size',
                highContrast: 'High contrast mode',
                reducedMotion: 'Reduce motion and animations',
                screenReader: 'Screen reader optimizations'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={preferences.accessibility[key as keyof typeof preferences.accessibility]}
                    onChange={(e) => updatePreference('accessibility', key, e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Default Views */}
          <div className="card-3d p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-mint" />
              Default Views
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dashboard Style
                </label>
                <select
                  value={preferences.defaultViews.dashboard}
                  onChange={(e) => updatePreference('defaultViews', 'dashboard', e.target.value)}
                  className="input-3d w-full text-sm"
                >
                  <option value="summary">Summary Cards</option>
                  <option value="detailed">Detailed View</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal History Range
                </label>
                <select
                  value={preferences.defaultViews.mealHistory}
                  onChange={(e) => updatePreference('defaultViews', 'mealHistory', e.target.value)}
                  className="input-3d w-full text-sm"
                >
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                  <option value="90days">Last 90 days</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight Chart Range
                </label>
                <select
                  value={preferences.defaultViews.weightChart}
                  onChange={(e) => updatePreference('defaultViews', 'weightChart', e.target.value)}
                  className="input-3d w-full text-sm"
                >
                  <option value="30days">30 days</option>
                  <option value="90days">90 days</option>
                  <option value="6months">6 months</option>
                </select>
              </div>
            </div>
          </div>

          {/* Auto Sync */}
          <div className="card-3d p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <RefreshCw className="w-4 h-4 mr-2 text-earth" />
              Auto Sync
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Enable auto sync</span>
                <input
                  type="checkbox"
                  checked={preferences.autoSync.enabled}
                  onChange={(e) => updatePreference('autoSync', 'enabled', e.target.checked)}
                  className="toggle-checkbox"
                />
              </div>
              {preferences.autoSync.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sync Frequency
                    </label>
                    <select
                      value={preferences.autoSync.frequency}
                      onChange={(e) => updatePreference('autoSync', 'frequency', e.target.value)}
                      className="input-3d w-full text-sm"
                    >
                      <option value="realtime">Real-time</option>
                      <option value="hourly">Every hour</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">WiFi only</span>
                    <input
                      type="checkbox"
                      checked={preferences.autoSync.wifiOnly}
                      onChange={(e) => updatePreference('autoSync', 'wifiOnly', e.target.checked)}
                      className="toggle-checkbox"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Privacy */}
          <div className="card-3d p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Privacy & Data</h3>
            <div className="space-y-2">
              {Object.entries({
                analyticsEnabled: 'Anonymous usage analytics',
                crashReporting: 'Automatic crash reports',
                marketingEmails: 'Marketing communications',
                usageData: 'Help improve the app'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={preferences.privacy[key as keyof typeof preferences.privacy]}
                    onChange={(e) => updatePreference('privacy', key, e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-primary pt-4 pb-6 mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-3d w-full py-4 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving Preferences...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Save className="w-4 h-4 mr-2" />
                  Save Preferences
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
