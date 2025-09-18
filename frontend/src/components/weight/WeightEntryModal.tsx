import React, { useState } from 'react';
import {
  X,
  Scale,
  Plus,
  Minus,
  Calendar,
  Clock,
  Camera,
  FileText,
  Save,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { mockFamilyMembers, getLatestWeightEntry } from '../../data/mockData';

interface WeightEntryModalProps {
  petId: string;
  onClose: () => void;
}

export const WeightEntryModal: React.FC<WeightEntryModalProps> = ({
  petId,
  onClose
}) => {
  const latestEntry = getLatestWeightEntry(petId);
  const [weight, setWeight] = useState<number>(latestEntry?.weight || 0);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(format(new Date(), 'HH:mm'));
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string>('');
  const [familyMember, setFamilyMember] = useState('family1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate preset weights around current weight
  const getPresetWeights = () => {
    const baseWeight = latestEntry?.weight || 25;
    return [
      Math.max(0, baseWeight - 1),
      Math.max(0, baseWeight - 0.5),
      baseWeight,
      baseWeight + 0.5,
      baseWeight + 1
    ].map(w => Math.round(w * 10) / 10);
  };

  const presetWeights = getPresetWeights();

  const convertWeight = (value: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs') => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'kg' && toUnit === 'lbs') return value * 2.20462;
    if (fromUnit === 'lbs' && toUnit === 'kg') return value / 2.20462;
    return value;
  };

  const handleUnitToggle = (newUnit: 'kg' | 'lbs') => {
    const convertedWeight = convertWeight(weight, unit, newUnit);
    setWeight(Math.round(convertedWeight * 10) / 10);
    setUnit(newUnit);
  };

  const adjustWeight = (delta: number) => {
    const newWeight = Math.max(0, weight + delta);
    setWeight(Math.round(newWeight * 10) / 10);
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    if (value >= 0) {
      setWeight(Math.round(value * 10) / 10);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPhoto(imageUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (weight <= 0) {
      alert('Please enter a valid weight');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert to kg if needed for storage
      const weightInKg = unit === 'lbs' ? convertWeight(weight, 'lbs', 'kg') : weight;

      // Create weight entry
      const weightEntry = {
        id: `weight-${Date.now()}`,
        petId,
        weight: Math.round(weightInKg * 10) / 10,
        date: new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`),
        notes: notes.trim() || undefined,
        photo: photo || undefined,
        loggedBy: familyMember
      };

      console.log('Creating weight entry:', weightEntry);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      onClose();
    } catch (error) {
      console.error('Failed to save weight entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHistoricalEntry = format(selectedDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-primary w-full max-w-md h-[90vh] rounded-t-3xl overflow-hidden shadow-3d">
        {/* Header */}
        <div className="bg-white p-4 shadow-3d">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Log Weight</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Digital Scale Display */}
          <div className="card-3d p-6 bg-gray-800">
            <div className="scale-display p-6 rounded-xl text-center">
              <div className="flex items-center justify-center mb-4">
                <Scale className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-4xl font-bold mb-2">
                {weight.toFixed(1)}
              </div>
              <div className="text-xl text-gray-400">
                {unit}
              </div>
            </div>
          </div>

          {/* Unit Toggle */}
          <div className="card-3d p-4">
            <div className="flex items-center justify-center space-x-1">
              <button
                type="button"
                onClick={() => handleUnitToggle('kg')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  unit === 'kg'
                    ? 'bg-mint text-gray-800 shadow-3d'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                kg
              </button>
              <button
                type="button"
                onClick={() => handleUnitToggle('lbs')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  unit === 'lbs'
                    ? 'bg-mint text-gray-800 shadow-3d'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                lbs
              </button>
            </div>
          </div>

          {/* Weight Input */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">Enter Weight</h3>

            {/* Manual Input with +/- buttons */}
            <div className="flex items-center space-x-3 mb-4">
              <button
                type="button"
                onClick={() => adjustWeight(-0.1)}
                className="btn-3d p-3 text-gray-700 flex-shrink-0"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                value={weight}
                onChange={handleWeightChange}
                step="0.1"
                min="0"
                className="input-3d text-center text-xl font-semibold flex-1"
              />

              <button
                type="button"
                onClick={() => adjustWeight(0.1)}
                className="btn-3d p-3 text-gray-700 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Quick Select:</p>
              <div className="grid grid-cols-5 gap-2">
                {presetWeights.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWeight(preset)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      Math.abs(weight - preset) < 0.01
                        ? 'bg-orange text-white shadow-3d'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {preset.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">Date & Time</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="input-3d w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="input-3d w-full text-sm"
                />
              </div>
            </div>
            {isHistoricalEntry && (
              <p className="text-xs text-amber-600 mt-2 flex items-center">
                ⚠️ This is a historical entry
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="card-3d p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., After morning walk, Before meal..."
              rows={3}
              className="input-3d w-full resize-none text-sm"
            />
          </div>

          {/* Photo Upload */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">
              <Camera className="w-4 h-4 inline mr-1" />
              Progress Photo (Optional)
            </h3>
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange transition-colors"
              >
                {photo ? (
                  <img src={photo} alt="Progress" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Tap to add photo</p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Family Member Selection */}
          <div className="card-3d p-4">
            <h3 className="font-medium text-gray-800 mb-3">
              <User className="w-4 h-4 inline mr-1" />
              Recorded by
            </h3>
            <div className="space-y-2">
              {mockFamilyMembers.map(member => (
                <label key={member.id} className="flex items-center">
                  <input
                    type="radio"
                    name="familyMember"
                    value={member.id}
                    checked={familyMember === member.id}
                    onChange={(e) => setFamilyMember(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-gray-700">{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pb-6">
            <button
              type="submit"
              disabled={isSubmitting || weight <= 0}
              className="btn-3d w-full py-4 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Save className="w-4 h-4 mr-2" />
                  Save Weight Entry
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
