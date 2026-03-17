import React, { useState } from 'react';
import { Upload } from 'lucide-react';

interface PostCopyFormProps {
  onSubmit: (data: { startDate: string, endDate: string, photoUrl: string }) => void;
}

export const PostCopyForm: React.FC<PostCopyFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    photoUrl: ''
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.photoUrl) {
      alert('Please upload a photo');
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Start Date</label>
          <input
            required
            type="date"
            className="w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={formData.startDate}
            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase ml-1">End Date</label>
          <input
            required
            type="date"
            className="w-full bg-zinc-50 border border-indigo-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={formData.endDate}
            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Upload Photo</label>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="photo-upload"
          />
          <label
            htmlFor="photo-upload"
            className={`w-full flex flex-col items-center justify-center gap-2 bg-zinc-50 border-2 border-dashed border-indigo-100 rounded-xl p-6 cursor-pointer hover:bg-indigo-50 transition-all ${formData.photoUrl ? 'border-indigo-400 bg-indigo-50/30' : ''}`}
          >
            {formData.photoUrl ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-indigo-200">
                <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Change Photo
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-indigo-50">
                  <Upload className={`w-5 h-5 text-indigo-600 ${isUploading ? 'animate-bounce' : ''}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-zinc-700">Click to upload photo</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">PNG, JPG or GIF (MAX. 2MB)</p>
                </div>
              </>
            )}
          </label>
        </div>
      </div>
      <button
        type="submit"
        disabled={isUploading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {isUploading ? 'Uploading...' : 'Activate Subscription'}
      </button>
    </form>
  );
};
