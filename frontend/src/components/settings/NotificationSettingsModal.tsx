import React, { useState } from 'react';
import {
  X,
  Bell,
  BellOff,
  Clock,
  Heart,
  Scale,
  Pill,
  Smartphone,
  Mail,
  Volume2,
  Vibrate,
  Save
} from 'lucide-react';

interface NotificationSettingsModalProps {
  onClose: () => void;
}

interface NotificationSettings {
  mealReminders: {
    enabled: boolean;
    times: string[];
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  medicineAlerts: {
    enabled: boolean;
    advanceNotice: number; // minutes before
    repeatInterval: number; // minutes
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  weightReminders: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'biweekly';
    time: string;
    soundEnabled: boolean;
  };
  activityUpdates: {
    enabled: boolean;
    familyActivities: boolean;
    dailySummary: boolean;
    weeklyReport: boolean;
  };
  emergencyAlerts: {
    enabled: boolean;
    smsEnabled: boolean;
    emailEnabled: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  onClose
}) => {
  const [settings, setSettings] = useState<NotificationSettings>({
    mealReminders: {
      enabled: true,
      times: ['08:00', '13:00', '18:00'],
      soundEnabled: true,
      vibrationEnabled: true
    },
    medicineAlerts: {
      enabled: true,
      advanceNotice: 15,
      repeatInterval: 5,
      soundEnabled: true,
      vibrationEnabled: true
    },
    weightReminders: {
      enabled: true,
      frequency: 'weekly',
      time: '09:00',
      soundEnabled: false
    },
    activityUpdates: {
      enabled: true,
      familyActivities: true,
      dailySummary: true,
      weeklyReport: true
    },
    emergencyAlerts: {
      enabled: true,
      smsEnabled: false,
      emailEnabled: true
    },
    quietHours: {
      enabled: true,
      startTime: '22:00',
      endTime: '07:00'
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateSettings = (category: keyof NotificationSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleMealTimeChange = (index: number, time: string) => {
    const newTimes = [...settings.mealReminders.times];
    newTimes[index] = time;
    updateSettings('mealReminders', 'times', newTimes);
  };

  const addMealTime = () => {
    if (settings.mealReminders.times.length < 6) {
      updateSettings('mealReminders', 'times', [...settings.mealReminders.times, '12:00']);
    }
  };

  const removeMealTime = (index: number) => {
    if (settings.mealReminders.times.length > 1) {
      const newTimes = settings.mealReminders.times.filter((_, i) => i !== index);
      updateSettings('mealReminders', 'times', newTimes);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Here you would save notification settings to API
      console.log('Saving notification settings:', settings);
      await new Promise(resolve => setTimeout(resolve, 1000));
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-primary w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden shadow-3d flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 shadow-3d flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Notification Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Meal Reminders */}
          <div className="card-3d p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <Heart className="w-4 h-4 mr-2 text-orange" />
                Meal Reminders
              </h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.mealReminders.enabled}
                  onChange={(e) => updateSettings('mealReminders', 'enabled', e.target.checked)}
                  className="toggle-checkbox"
                />
              </label>
            </div>

            {settings.mealReminders.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meal Times
                  </label>
                  <div className="space-y-2">
                    {settings.mealReminders.times.map((time, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => handleMealTimeChange(index, e.target.value)}
                          className="input-3d flex-1 text-sm"
                        />
                        {settings.mealReminders.times.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMealTime(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {settings.mealReminders.times.length < 6 && (
                      <button
                        type="button"
                        onClick={addMealTime}
                        className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange hover:text-orange transition-colors text-sm"
                      >
                        + Add Meal Time
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Sound</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.mealReminders.soundEnabled}
                    onChange={(e) => updateSettings('mealReminders', 'soundEnabled', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Vibrate className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Vibration</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.mealReminders.vibrationEnabled}
                    onChange={(e) => updateSettings('mealReminders', 'vibrationEnabled', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Medicine Alerts */}
          <div className="card-3d p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <Pill className="w-4 h-4 mr-2 text-mint" />
                Medicine Alerts
              </h3>
              <input
                type="checkbox"
                checked={settings.medicineAlerts.enabled}
                onChange={(e) => updateSettings('medicineAlerts', 'enabled', e.target.checked)}
                className="toggle-checkbox"
              />
            </div>

            {settings.medicineAlerts.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Advance Notice (minutes before)
                  </label>
                  <select
                    value={settings.medicineAlerts.advanceNotice}
                    onChange={(e) => updateSettings('medicineAlerts', 'advanceNotice', parseInt(e.target.value))}
                    className="input-3d w-full text-sm"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repeat if not acknowledged
                  </label>
                  <select
                    value={settings.medicineAlerts.repeatInterval}
                    onChange={(e) => updateSettings('medicineAlerts', 'repeatInterval', parseInt(e.target.value))}
                    className="input-3d w-full text-sm"
                  >
                    <option value={0}>Don't repeat</option>
                    <option value={5}>Every 5 minutes</option>
                    <option value={10}>Every 10 minutes</option>
                    <option value={15}>Every 15 minutes</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">High priority sound</span>
                  <input
                    type="checkbox"
                    checked={settings.medicineAlerts.soundEnabled}
                    onChange={(e) => updateSettings('medicineAlerts', 'soundEnabled', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Vibration</span>
                  <input
                    type="checkbox"
                    checked={settings.medicineAlerts.vibrationEnabled}
                    onChange={(e) => updateSettings('medicineAlerts', 'vibrationEnabled', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Weight Reminders */}
          <div className="card-3d p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <Scale className="w-4 h-4 mr-2 text-earth" />
                Weight Reminders
              </h3>
              <input
                type="checkbox"
                checked={settings.weightReminders.enabled}
                onChange={(e) => updateSettings('weightReminders', 'enabled', e.target.checked)}
                className="toggle-checkbox"
              />
            </div>

            {settings.weightReminders.enabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={settings.weightReminders.frequency}
                    onChange={(e) => updateSettings('weightReminders', 'frequency', e.target.value)}
                    className="input-3d w-full text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 weeks</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Time
                  </label>
                  <input
                    type="time"
                    value={settings.weightReminders.time}
                    onChange={(e) => updateSettings('weightReminders', 'time', e.target.value)}
                    className="input-3d w-full text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Sound</span>
                  <input
                    type="checkbox"
                    checked={settings.weightReminders.soundEnabled}
                    onChange={(e) => updateSettings('weightReminders', 'soundEnabled', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Activity Updates */}
          <div className="card-3d p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <Bell className="w-4 h-4 mr-2 text-orange" />
                Activity Updates
              </h3>
              <input
                type="checkbox"
                checked={settings.activityUpdates.enabled}
                onChange={(e) => updateSettings('activityUpdates', 'enabled', e.target.checked)}
                className="toggle-checkbox"
              />
            </div>

            {settings.activityUpdates.enabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Family member activities</span>
                  <input
                    type="checkbox"
                    checked={settings.activityUpdates.familyActivities}
                    onChange={(e) => updateSettings('activityUpdates', 'familyActivities', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Daily summary</span>
                  <input
                    type="checkbox"
                    checked={settings.activityUpdates.dailySummary}
                    onChange={(e) => updateSettings('activityUpdates', 'dailySummary', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Weekly report</span>
                  <input
                    type="checkbox"
                    checked={settings.activityUpdates.weeklyReport}
                    onChange={(e) => updateSettings('activityUpdates', 'weeklyReport', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Emergency Alerts */}
          <div className="card-3d p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <BellOff className="w-4 h-4 mr-2 text-red-500" />
                Emergency Alerts
              </h3>
              <input
                type="checkbox"
                checked={settings.emergencyAlerts.enabled}
                onChange={(e) => updateSettings('emergencyAlerts', 'enabled', e.target.checked)}
                className="toggle-checkbox"
              />
            </div>

            {settings.emergencyAlerts.enabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">SMS notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.emergencyAlerts.smsEnabled}
                    onChange={(e) => updateSettings('emergencyAlerts', 'smsEnabled', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Email notifications</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.emergencyAlerts.emailEnabled}
                    onChange={(e) => updateSettings('emergencyAlerts', 'emailEnabled', e.target.checked)}
                    className="toggle-checkbox"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              For critical health alerts and missed medicine reminders
            </p>
          </div>

          {/* Quiet Hours */}
          <div className="card-3d p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-gray-600" />
                Quiet Hours
              </h3>
              <input
                type="checkbox"
                checked={settings.quietHours.enabled}
                onChange={(e) => updateSettings('quietHours', 'enabled', e.target.checked)}
                className="toggle-checkbox"
              />
            </div>

            {settings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.quietHours.startTime}
                    onChange={(e) => updateSettings('quietHours', 'startTime', e.target.value)}
                    className="input-3d w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={settings.quietHours.endTime}
                    onChange={(e) => updateSettings('quietHours', 'endTime', e.target.value)}
                    className="input-3d w-full text-sm"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Only emergency alerts will be shown during quiet hours
            </p>
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
                  Saving Settings...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Save className="w-4 h-4 mr-2" />
                  Save Notification Settings
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
