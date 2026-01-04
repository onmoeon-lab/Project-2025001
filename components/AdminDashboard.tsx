
import React, { useState, useEffect } from 'react';
import { db } from '../data';
import { User, QuestionSet, Question, QuizResult } from '../types';
import { supabase } from '../supabaseClient'; 

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [activeTab, setActiveTab] = useState<'sets' | 'users' | 'results' | 'editor'>('sets');
  
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [currentSetForQuestions, setCurrentSetForQuestions] = useState<QuestionSet | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setSets(await db.getQuestionSets());
      setUsers(await db.getUsers());
      setResults(await db.getQuizResults());
    };
    loadData();
  }, [activeTab]);

  const handleSaveSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSet) return;
    
    let newSets;
    if (editingSet.id) {
      newSets = sets.map(s => s.id === editingSet.id ? editingSet : s);
    } else {
      const newSet = { ...editingSet, id: db.generateId(), questions: [], isLive: false };
      newSets = [...sets, newSet as QuestionSet];
    }
    await db.saveQuestionSets(newSets);
    setSets(newSets);
    setEditingSet(null);
  };

  const handleToggleLive = async (id: string) => {
    const updated = sets.map(s => ({
      ...s,
      isLive: s.id === id ? !s.isLive : false
    }));
    await db.saveQuestionSets(updated);
    setSets(updated);
  };

  const handleDeleteSet = async (id: string) => {
    if (confirm('এই সেটটি মুছে ফেলতে চান?')) {
      const updated = sets.filter(s => s.id !== id);
      await db.saveQuestionSets(updated);
      setSets(updated);
    }
  };

  const openQuestionEditor = (set: QuestionSet) => {
    setCurrentSetForQuestions(set);
    setActiveTab('editor');
  };

  const handleAddQuestion = async () => {
    if (!currentSetForQuestions) return;
    const newQ: Question = {
      id: db.generateId(),
      text: 'নতুন প্রশ্ন লিখুন',
      options: ['অপশন ১', 'অপশন ২', 'অপশন ৩', 'অপশন ৪'],
      correctOption: 'A'
    };
    const updatedSet = { ...currentSetForQuestions, questions: [...currentSetForQuestions.questions, newQ] };
    const updatedSets = sets.map(s => s.id === updatedSet.id ? updatedSet : s);
    await db.saveQuestionSets(updatedSets);
    setSets(updatedSets);
    setCurrentSetForQuestions(updatedSet);
  };

  const updateQuestion = async (qId: string, fields: Partial<Question>) => {
    if (!currentSetForQuestions) return;
    const updatedQs = currentSetForQuestions.questions.map(q => q.id === qId ? { ...q, ...fields } : q);
    const updatedSet = { ...currentSetForQuestions, questions: updatedQs };
    const updatedSets = sets.map(s => s.id === updatedSet.id ? updatedSet : s);
    await db.saveQuestionSets(updatedSets);
    setSets(updatedSets);
    setCurrentSetForQuestions(updatedSet);
  };

  const deleteQuestion = async (qId: string) => {
    if (!currentSetForQuestions) return;
    const updatedQs = currentSetForQuestions.questions.filter(q => q.id !== qId);
    const updatedSet = { ...currentSetForQuestions, questions: updatedQs };
    const updatedSets = sets.map(s => s.id === updatedSet.id ? updatedSet : s);
    await db.saveQuestionSets(updatedSets);
    setSets(updatedSets);
    setCurrentSetForQuestions(updatedSet);
  };



// ... inside the component

const handleImageUpload = async (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    // 1. Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // 2. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('exam-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 3. Get Public URL
    const { data } = supabase.storage
      .from('exam-images')
      .getPublicUrl(filePath);

    // 4. Save the URL to the question
    updateQuestion(qId, { imageUrl: data.publicUrl });

  } catch (error) {
    console.error('Error uploading image:', error);
    alert('ছবি আপলোড করতে সমস্যা হয়েছে।');
  }
};

  const handleOptionChange = (qId: string, index: number, value: string) => {
    const question = currentSetForQuestions?.questions.find(q => q.id === qId);
    if (!question) return;
    const newOptions = [...question.options];
    newOptions[index] = value;
    updateQuestion(qId, { options: newOptions });
  };

  const addOption = (qId: string) => {
    const question = currentSetForQuestions?.questions.find(q => q.id === qId);
    if (!question || question.options.length >= 6) return;
    updateQuestion(qId, { options: [...question.options, 'নতুন অপশন'] });
  };

  const removeOption = (qId: string, index: number) => {
    const question = currentSetForQuestions?.questions.find(q => q.id === qId);
    if (!question || question.options.length <= 2) return;
    const newOptions = question.options.filter((_, i) => i !== index);
    
    // Check if we removed the correct answer
    const removedLabel = String.fromCharCode(65 + index);
    let newCorrect = question.correctOption;
    if (newCorrect === removedLabel) {
       newCorrect = 'A'; // Reset to A if the correct one was removed
    } else if (newCorrect > removedLabel) {
       // If correct answer was "D" (index 3) and we remove "C" (index 2), D becomes C.
       newCorrect = String.fromCharCode(newCorrect.charCodeAt(0) - 1);
    }

    updateQuestion(qId, { options: newOptions, correctOption: newCorrect });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    let newUsers;
    if (editingUser.id) {
      newUsers = users.map(u => u.id === editingUser.id ? (editingUser as User) : u);
    } else {
      const newUser = { ...editingUser, id: db.generateId(), role: 'user' as const };
      newUsers = [...users, newUser as User];
    }
    await db.saveUsers(newUsers);
    setUsers(newUsers);
    setEditingUser(null);
  };

  const deleteUser = async (id: string) => {
    if (confirm('এই ইউজারটি মুছে ফেলতে চান?')) {
      const updated = users.filter(u => u.id !== id);
      await db.saveUsers(updated);
      setUsers(updated);
    }
  };

  const getUserStats = () => {
    return users.filter(u => u.role !== 'admin').map((u, index) => {
      const userResults = results.filter(r => r.userId === u.id).sort((a, b) => b.timestamp - a.timestamp);
      const lastResult = userResults[0];
      return {
         serial: index + 1,
         name: u.name,
         userId: u.username,
         totalAttempts: userResults.length,
         lastAttemptDate: lastResult ? new Date(lastResult.timestamp).toLocaleDateString('bn-BD') + ' ' + new Date(lastResult.timestamp).toLocaleTimeString('bn-BD') : 'N/A',
         lastRatio: lastResult ? `${Math.round((lastResult.correctAnswers / lastResult.totalQuestions) * 100)}%` : 'N/A'
      };
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-[#004d40] text-white p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">অ্যাডমিন কন্ট্রোল প্যানেল</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-xs opacity-70">লগইন করা আছে:</p>
            <p className="text-sm font-bold">{user.name}</p>
          </div>
          <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-bold transition-colors shadow-sm">লগআউট</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 bg-white border-r flex flex-col py-4 shadow-sm">
          <button onClick={() => setActiveTab('sets')} className={`px-6 py-4 text-left font-bold text-sm transition-all border-l-4 ${activeTab === 'sets' || activeTab === 'editor' ? 'bg-teal-50 text-[#004d40] border-[#004d40]' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}>📋 প্রশ্ন সেট ম্যানেজমেন্ট</button>
          <button onClick={() => setActiveTab('users')} className={`px-6 py-4 text-left font-bold text-sm transition-all border-l-4 ${activeTab === 'users' ? 'bg-teal-50 text-[#004d40] border-[#004d40]' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}>👥 ইউজার ম্যানেজমেন্ট</button>
          <button onClick={() => setActiveTab('results')} className={`px-6 py-4 text-left font-bold text-sm transition-all border-l-4 ${activeTab === 'results' ? 'bg-teal-50 text-[#004d40] border-[#004d40]' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}>📊 পরীক্ষার ফলাফল</button>
        </nav>

        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'sets' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div><h2 className="text-xl font-bold text-gray-800">মোট প্রশ্ন সেট: {sets.length}</h2></div>
                <button onClick={() => setEditingSet({ title: '', description: '', timeLimit: 10, category: 'পরিচিতি' } as any)} className="bg-[#004d40] text-white px-6 py-2 rounded-md font-bold hover:bg-[#00332c]">+ নতুন সেট যোগ করুন</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sets.map(set => (
                  <div key={set.id} className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden ${set.isLive ? 'border-green-500' : 'border-transparent'}`}>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-800">{set.title}</h3>
                      <p className="text-sm text-gray-400 mb-4">বিভাগ: {set.category || 'পরিচিতি'}</p>
                      <div className="flex gap-2 pt-4 border-t">
                        <button onClick={() => handleToggleLive(set.id)} className={`flex-1 py-2 rounded text-xs font-bold ${set.isLive ? 'bg-gray-100 text-gray-600' : 'bg-green-600 text-white'}`}>{set.isLive ? 'বন্ধ করুন' : 'লাইভ করুন'}</button>
                        <button onClick={() => openQuestionEditor(set)} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded text-xs font-bold">প্রশ্ন এডিটর</button>
                        <button onClick={() => setEditingSet(set)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded text-xs font-bold">এডিট</button>
                        <button onClick={() => handleDeleteSet(set.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded text-xs font-bold">মুছে ফেলুন</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <h2 className="text-xl font-bold text-gray-800">ইউজার লিস্ট</h2>
                <button onClick={() => setEditingUser({ name: '', username: '', password: '', position: 'Load and Unload Worker', language: 'বাংলা' })} className="bg-[#004d40] text-white px-6 py-2 rounded-md font-bold hover:bg-[#00332c]">নতুন ইউজার যোগ করুন</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">নাম</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">পদবি</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-teal-50/30">
                        <td className="px-6 py-4 font-bold text-gray-700">{u.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{u.position}</td>
                        <td className="px-6 py-4 text-right space-x-4">
                          <button onClick={() => setEditingUser(u)} className="text-blue-600 font-bold text-xs">এডিট</button>
                          {u.username !== 'admin' && <button onClick={() => deleteUser(u.id)} className="text-red-600 font-bold text-xs">মুছে ফেলুন</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <h2 className="text-xl font-bold text-gray-800">পরীক্ষার ফলাফল</h2>
              </div>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Serial</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">User ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Total Attempts</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Last Attempt Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Correct Ratio (Last Exam)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {getUserStats().map(stat => (
                      <tr key={stat.serial} className="hover:bg-teal-50/30">
                        <td className="px-6 py-4 font-bold text-gray-700 text-center">{stat.serial}</td>
                        <td className="px-6 py-4 font-bold text-gray-700">{stat.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{stat.userId}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-bold text-center">{stat.totalAttempts}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{stat.lastAttemptDate}</td>
                        <td className="px-6 py-4 text-sm text-center">
                          {stat.lastRatio !== 'N/A' ? <span className={`px-3 py-1 rounded-full text-xs font-bold ${parseInt(stat.lastRatio) >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>{stat.lastRatio}</span> : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getUserStats().length === 0 && <div className="p-12 text-center text-gray-400 text-sm">কোনো ফলাফল পাওয়া যায়নি</div>}
              </div>
            </div>
          )}
          
          {activeTab === 'editor' && currentSetForQuestions && (
             <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <button onClick={() => setActiveTab('sets')} className="text-gray-500 font-bold">← ফিরে যান</button>
                  <h2 className="text-2xl font-bold">প্রশ্ন এডিটর: {currentSetForQuestions.title}</h2>
                </div>
                <div className="space-y-4">
                  {currentSetForQuestions.questions.map((q, idx) => (
                    <div key={q.id} className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                      <div className="flex justify-between">
                        <span className="bg-[#004d40] text-white px-3 py-1 rounded-full text-xs font-bold">প্রশ্ন {idx + 1}</span>
                        <button onClick={() => deleteQuestion(q.id)} className="text-red-500 text-xs font-bold">মুছে ফেলুন</button>
                      </div>
                      <input type="text" value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} className="w-full text-lg font-bold border-b outline-none py-2" placeholder="প্রশ্নটি লিখুন..." />
                      
                      <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase">ছবি যুক্ত করুন (লিঙ্ক বা আপলোড)</label>
                        <div className="flex flex-col gap-3">
                          <input type="text" value={q.imageUrl || ''} onChange={(e) => updateQuestion(q.id, { imageUrl: e.target.value })} className="w-full border rounded p-2 text-sm text-gray-600 outline-none focus:border-teal-500" placeholder="ছবির ডাইরেক্ট লিঙ্ক পেস্ট করুন..." />
                          <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-400 font-bold">অথবা</span>
                             <label className="flex-1 cursor-pointer">
                                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(q.id, e)} className="hidden" />
                                <div className="bg-white border border-dashed border-gray-400 rounded p-2 text-center text-xs text-gray-600 font-bold hover:bg-gray-100 transition-colors">কম্পিউটার থেকে ছবি আপলোড করুন</div>
                             </label>
                          </div>
                        </div>
                        {q.imageUrl && (
                          <div className="mt-2 relative inline-block group">
                            <img src={q.imageUrl} alt="preview" className="h-24 object-contain rounded border bg-white shadow-sm" />
                            <button onClick={() => updateQuestion(q.id, { imageUrl: '' })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {q.options.map((opt, i) => {
                          const label = String.fromCharCode(65 + i);
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <button onClick={() => updateQuestion(q.id, { correctOption: label })} className={`w-8 h-8 rounded-full border-2 font-bold text-xs flex items-center justify-center ${q.correctOption === label ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 hover:border-gray-400'}`}>{label}</button>
                              <input type="text" value={opt} onChange={(e) => handleOptionChange(q.id, i, e.target.value)} className="flex-1 border rounded p-2 text-sm focus:border-teal-500 outline-none" placeholder={`অপশন ${label}`} />
                              {q.options.length > 2 && (
                                <button onClick={() => removeOption(q.id, i)} className="text-red-500 font-bold px-2 hover:bg-red-50 rounded">×</button>
                              )}
                            </div>
                          );
                        })}
                        {q.options.length < 6 && (
                           <button onClick={() => addOption(q.id)} className="text-blue-600 text-xs font-bold text-left hover:underline">+ অপশন যোগ করুন</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={handleAddQuestion} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 font-bold hover:bg-gray-50 hover:border-gray-400 transition-all">+ নতুন প্রশ্ন যোগ করুন</button>
                </div>
             </div>
          )}
        </main>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveUser} className="bg-white rounded-lg w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#004d40] p-4 text-white font-bold">ইউজার {editingUser.id ? 'সম্পাদনা' : 'তৈরি'} করুন</div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">পূর্ণ নাম (Candidate Name)</label>
                <input required type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full border rounded p-2 focus:ring-1 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">পদবি (Position)</label>
                <input required type="text" value={editingUser.position} onChange={e => setEditingUser({...editingUser, position: e.target.value})} className="w-full border rounded p-2 focus:ring-1 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ভাষা (Language)</label>
                <input required type="text" value={editingUser.language} onChange={e => setEditingUser({...editingUser, language: e.target.value})} className="w-full border rounded p-2 focus:ring-1 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ইউজার আইডি</label>
                <input required type="text" value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} className="w-full border rounded p-2 focus:ring-1 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">পাসওয়ার্ড</label>
                <input required type="text" value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full border rounded p-2 focus:ring-1 focus:ring-teal-500 outline-none" />
              </div>
            </div>
            <div className="bg-gray-50 p-4 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-500 font-bold text-sm">বাতিল</button>
              <button type="submit" className="bg-[#004d40] text-white px-6 py-2 rounded font-bold text-sm">সংরক্ষণ করুন</button>
            </div>
          </form>
        </div>
      )}
      
      {editingSet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveSet} className="bg-white rounded-lg w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#004d40] p-4 text-white font-bold">সেট তথ্য {editingSet.id ? 'সম্পাদনা' : 'তৈরি'} করুন</div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">শিরোনাম</label>
                <input required type="text" value={editingSet.title} onChange={e => setEditingSet({...editingSet, title: e.target.value})} className="w-full border rounded p-2 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">বিভাগ (Category)</label>
                <input required type="text" value={editingSet.category} onChange={e => setEditingSet({...editingSet, category: e.target.value})} className="w-full border rounded p-2 outline-none" placeholder="উদা: পরিচিতি" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">সময়সীমা (মিনিট)</label>
                <input required type="number" value={editingSet.timeLimit} onChange={e => setEditingSet({...editingSet, timeLimit: parseInt(e.target.value)})} className="w-full border rounded p-2 outline-none" />
              </div>
            </div>
            <div className="bg-gray-50 p-4 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingSet(null)} className="px-4 py-2 text-gray-500 font-bold text-sm">বাতিল</button>
              <button type="submit" className="bg-[#004d40] text-white px-6 py-2 rounded font-bold text-sm">সংরক্ষণ করুন</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
