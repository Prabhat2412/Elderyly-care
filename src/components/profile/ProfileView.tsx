import React from 'react';
import { motion } from 'framer-motion';
import { UserCircle } from 'lucide-react';

export function ProfileView({ user, medicalProfile, onBack }: { user: any, medicalProfile?: any, onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black tracking-tighter">My Profile</h2>
        <button onClick={onBack} className="p-4 bg-gray-100 rounded-2xl font-bold">Back</button>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-gray-100 text-center space-y-6">
        <div className="w-32 h-32 bg-rose-100 rounded-[48px] flex items-center justify-center mx-auto shadow-inner">
          <UserCircle className="w-20 h-20 text-rose-500" />
        </div>
        <div>
          <h3 className="text-4xl font-black tracking-tight">{user.name}</h3>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-2">{user.role}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-8 border-t border-gray-50">
          <div className="p-6 bg-gray-50 rounded-3xl">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</p>
            <p className="font-bold text-lg">{user.email}</p>
          </div>
          <div className="p-6 bg-gray-50 rounded-3xl">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Options</p>
            <div className="flex flex-col gap-1">
              <button className="text-sm font-bold text-rose-500 text-left hover:underline">Edit Security Settings</button>
              <button className="text-sm font-bold text-gray-500 text-left hover:underline">Privacy Policy</button>
            </div>
          </div>
        </div>

        {user.role === 'elderly' && medicalProfile && (
          <div className="pt-8 border-t border-gray-50 text-left space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Blood Type</p>
                <p className="font-black text-xl text-rose-500">{medicalProfile.blood_type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cognitive</p>
                <p className="font-black text-xl text-amber-600">{medicalProfile.cognitive_status || 'Stable'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fall Risk</p>
                <p className="font-black text-xl text-rose-600">{medicalProfile.fall_risk || 'Low'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Chronic Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {medicalProfile.chronic_conditions?.map((c: string) => (
                    <span key={c} className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg font-bold text-xs">{c}</span>
                  ))}
                  {!medicalProfile.chronic_conditions?.length && <p className="text-gray-400 italic text-sm">None listed</p>}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {medicalProfile.allergies?.map((a: string) => (
                    <span key={a} className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg font-bold text-xs">{a}</span>
                  ))}
                  {!medicalProfile.allergies?.length && <p className="text-gray-400 italic text-sm">None listed</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-rose-50 p-8 rounded-[40px] border border-rose-100">
        <p className="text-rose-600 font-bold text-center">Your profile data is encrypted and only visible to authorized caregivers and linked family members. 🔒</p>
      </div>
    </motion.div>
  );
}
