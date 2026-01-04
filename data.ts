// import { User, QuestionSet, QuizResult } from './types';

// const USERS_KEY = 'exam_app_users';
// const SETS_KEY = 'exam_app_question_sets';
// const RESULTS_KEY = 'exam_app_results';

// const INITIAL_ADMIN: User = {
//   id: 'admin-1',
//   username: 'admin',
//   password: '123',
//   role: 'admin',
//   name: 'System Administrator'
// };

// const INITIAL_USER: User = {
//   id: 'user-1',
//   username: 'user',
//   password: '123',
//   role: 'user',
//   name: 'Regular User'
// };

// const INITIAL_SETS: QuestionSet[] = [
//   {
//     id: 'set-1',
//     title: 'NUR Exam - Physical Labor',
//     category: 'পরিচিতি',
//     description: 'সাধারণ পরিচিতি এবং নিরাপত্তা সংক্রান্ত পরীক্ষা।',
//     timeLimit: 5,
//     isLive: true,
//     questions: [
//       {
//         id: 'q1',
//         text: 'কাজ শুরু করার আগে প্রথমে কী করা উচিত?',
//         options: [
//           'দ্রুত কাজ শুরু করা',
//           'সঠিক ভাবে সুরক্ষা সরঞ্জাম ব্যবহার করা',
//           'সহজ কাজটি আগে করা',
//           'সবার জন্য অপেক্ষা করা এবং তারপর কাজ শুরু করা'
//         ],
//         correctOption: 'B'
//       },
//       {
//         id: 'q2',
//         text: 'কোথাও আগুন লাগলে তুমি কি করবে?',
//         options: [
//           'আগুন লাগলে দৌঁড়িয়ে পালিয়ে যাব',
//           'আগুন দেখতে পেয়ে লুকিয়ে পরব এবং কাউকে কিছু বলব না।',
//           'ফায়ার এক্সট্রাটিংগুইশার দিয়ে আগুন নেভানোর চেষ্টা করব',
//           'আগুনের ভিডিও করে সোশ্যাল মিডিয়ায় পোস্ট করব'
//         ],
//         correctOption: 'C'
//       },
//       {
//         id: 'q3',
//         text: 'ছবিতে দেখানো যন্ত্রটির নাম কী?',
//         imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1000&auto=format&fit=crop',
//         options: [
//           'ফায়ার সিলিন্ডার',
//           'হ্যান্ড প্যালেট জ্যাক',
//           'প্লাটফর্ম ট্রলি',
//           'মই'
//         ],
//         correctOption: 'C'
//       },
//       {
//         id: 'q4',
//         text: 'ভারী বস্তু তোলার সময় শরীরের কোন অংশ সোজা রাখা উচিত?',
//         options: [
//           'হাত',
//           'পা',
//           'পিঠ',
//           'মাথা'
//         ],
//         correctOption: 'C'
//       },
//       {
//         id: 'q5',
//         text: 'অফিসের সরঞ্জাম স্থানান্তরের জন্য ছবিতে প্রদর্শিত কোন যন্ত্রটি ব্যবহার করতে হবে?',
//         imageUrl: 'https://images.unsplash.com/photo-1620352011749-317a3f81e649?q=80&w=1000&auto=format&fit=crop',
//         options: [
//           'প্লাটফর্ম ট্রলি',
//           'হ্যান্ড প্যালেট জ্যাক',
//           'ফর্কলিফট',
//           'ক্রেন'
//         ],
//         correctOption: 'B'
//       }
//     ]
//   }
// ];

// export const db = {
//   getUsers: async (): Promise<User[]> => {
//     const data = localStorage.getItem(USERS_KEY);
//     return data ? JSON.parse(data) : [INITIAL_ADMIN, INITIAL_USER];
//   },
//   saveUsers: async (users: User[]): Promise<void> => {
//     localStorage.setItem(USERS_KEY, JSON.stringify(users));
//   },
//   getQuestionSets: async (): Promise<QuestionSet[]> => {
//     const data = localStorage.getItem(SETS_KEY);
//     return data ? JSON.parse(data) : INITIAL_SETS;
//   },
//   saveQuestionSets: async (sets: QuestionSet[]): Promise<void> => {
//     localStorage.setItem(SETS_KEY, JSON.stringify(sets));
//   },
//   getQuizResults: async (): Promise<QuizResult[]> => {
//     const data = localStorage.getItem(RESULTS_KEY);
//     return data ? JSON.parse(data) : [];
//   },
//   saveQuizResult: async (result: QuizResult): Promise<void> => {
//     const results = await db.getQuizResults();
//     results.push(result);
//     localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
//   },
//   generateId: () => Math.random().toString(36).substr(2, 9)
// };

import { supabase } from "./supabaseClient";
import { User, QuestionSet, QuizResult } from "./types";

export const db = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data || [];
  },

  loginUser: async (
    username: string,
    password: string
  ): Promise<User | null> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password) // Still insecure plaintext, but server-side filtered
      .single();

    if (error || !data) return null;
    return data as User;
  },

  saveUsers: async (users: User[]): Promise<void> => {
    // This is tricky because your app sends the WHOLE array.
    // We need to upsert (update if exists, insert if new).
    // Ideally, refactor frontend to save ONE user, but to keep your app working:
    const { error } = await supabase.from("users").upsert(users);
    if (error) throw error;
  },

  // --- QUESTION SETS ---
  getQuestionSets: async (): Promise<QuestionSet[]> => {
    const { data, error } = await supabase
      .from("question_sets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Map DB snake_case to your camelCase types if necessary,
    // but since we named columns carefully, it might map directly
    // except for `time_limit` and `is_live`.
    return (
      (data?.map((d) => ({
        ...d,
        timeLimit: d.time_limit,
        isLive: d.is_live,
      })) as QuestionSet[]) || []
    );
  },

  saveQuestionSets: async (sets: QuestionSet[]): Promise<void> => {
    // Converting camelCase back to snake_case for DB
    const formattedSets = sets.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      category: s.category,
      time_limit: s.timeLimit,
      is_live: s.isLive,
      questions: s.questions, // storing JSONB
    }));

    const { error } = await supabase
      .from("question_sets")
      .upsert(formattedSets);
    if (error) throw error;
  },

  // --- RESULTS ---
  getQuizResults: async (): Promise<QuizResult[]> => {
    const { data, error } = await supabase.from("quiz_results").select("*");
    if (error) throw error;

    return (
      (data?.map((r) => ({
        id: r.id,
        userId: r.user_id,
        examId: r.exam_id,
        examTitle: r.exam_title,
        totalQuestions: r.total_questions,
        correctAnswers: r.correct_answers,
        timestamp: Number(r.timestamp),
      })) as QuizResult[]) || []
    );
  },

  saveQuizResult: async (result: QuizResult): Promise<void> => {
    const { error } = await supabase.from("quiz_results").insert({
      id: result.id,
      user_id: result.userId,
      exam_id: result.examId,
      exam_title: result.examTitle,
      total_questions: result.totalQuestions,
      correct_answers: result.correctAnswers,
      timestamp: result.timestamp,
    });
    if (error) console.error("Supabase Error:", error);
  },

  generateId: () => crypto.randomUUID(), // Better UUID generation
};
