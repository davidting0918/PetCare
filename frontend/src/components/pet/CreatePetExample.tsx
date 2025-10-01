import React, { useState } from 'react';
import { CreatePetForm } from './CreatePetForm';

/**
 * Example component showing how to use CreatePetForm in other places
 * This demonstrates the reusability of the separated CreatePetForm component
 */
export const CreatePetExample: React.FC = () => {
  const [showForm, setShowForm] = useState(false);

  const handleSuccess = () => {
    console.log('Pet created successfully!');
    setShowForm(false);
    // Here you could:
    // - Show a success message
    // - Refresh a pet list
    // - Navigate to another page
    // - Update global state
  };

  const handleCancel = () => {
    console.log('Pet creation cancelled');
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-primary p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-earth mb-6">Create Pet Example</h1>

        <p className="text-gray-600 mb-4">
          This demonstrates how to use the reusable CreatePetForm component in other parts of the application.
        </p>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-3d btn-3d-mint text-white px-6 py-3 font-semibold"
          >
            Open Create Pet Form
          </button>
        )}

        <CreatePetForm
          isVisible={showForm}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          className="mt-6"
        />

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Usage:</h3>
          <pre className="text-sm text-gray-600 overflow-x-auto">
{`import { CreatePetForm } from '../pet';

<CreatePetForm
  isVisible={showForm}
  onSuccess={() => console.log('Success!')}
  onCancel={() => setShowForm(false)}
  className="optional-custom-classes"
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
};
