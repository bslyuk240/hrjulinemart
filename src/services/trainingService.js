import {
  supabase,
  TABLES,
  handleSupabaseError,
  handleSupabaseSuccess,
} from './supabase';

const LESSON_TYPES = {
  CONTENT: 'content',
  VIDEO: 'video',
  RESOURCES: 'resources',
  QUIZ: 'quiz',
};

const DEFAULT_COURSE_STATUS = 'draft';

const safeJsonParse = (value, fallback) => {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCourseRow = (course) => ({
  ...course,
  estimated_minutes: Number(course?.estimated_minutes || 0),
});

const normalizeLessonRow = (lesson) => ({
  ...lesson,
  resources_json: normalizeArray(safeJsonParse(lesson?.resources_json, [])),
});

const normalizeQuestionRow = (question) => ({
  ...question,
  options_json: normalizeArray(safeJsonParse(question?.options_json, [])),
  correct_answer_json: safeJsonParse(question?.correct_answer_json, null),
  points: Number(question?.points || 1),
});

const unique = (items) => [...new Set((items || []).filter(Boolean))];

const bySortOrder = (a, b) => {
  const left = Number(a?.sort_order || 0);
  const right = Number(b?.sort_order || 0);
  if (left !== right) return left - right;
  return Number(a?.id || 0) - Number(b?.id || 0);
};

const normalizeAnswerValue = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim().toLowerCase())
      .sort()
      .join('|');
  }
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'boolean') return String(value);
  if (value == null) return '';
  return String(value).trim().toLowerCase();
};

const isAnswerCorrect = (question, submittedAnswer) => {
  const normalizedSubmitted = normalizeAnswerValue(submittedAnswer);
  const correctAnswer = question.correct_answer_json;

  if (question.question_type === 'multi') {
    return normalizedSubmitted === normalizeAnswerValue(normalizeArray(correctAnswer));
  }

  if (question.question_type === 'short' && Array.isArray(correctAnswer)) {
    return correctAnswer.some(
      (candidate) => normalizeAnswerValue(candidate) === normalizedSubmitted
    );
  }

  return normalizedSubmitted === normalizeAnswerValue(correctAnswer);
};

const mapLessonsByCourseId = (modules, lessons) => {
  const moduleToCourse = new Map(modules.map((module) => [module.id, module.course_id]));
  const lessonsByCourse = {};

  for (const lesson of lessons) {
    const courseId = moduleToCourse.get(lesson.module_id);
    if (!courseId) continue;
    if (!lessonsByCourse[courseId]) lessonsByCourse[courseId] = [];
    lessonsByCourse[courseId].push(lesson);
  }

  return lessonsByCourse;
};

const buildQuizCourseMap = (quizzes, modules, lessons) => {
  const moduleToCourse = new Map(modules.map((module) => [module.id, module.course_id]));
  const lessonToModule = new Map(lessons.map((lesson) => [lesson.id, lesson.module_id]));
  const quizCourseMap = {};

  for (const quiz of quizzes) {
    if (quiz.lesson_id) {
      const moduleId = lessonToModule.get(quiz.lesson_id);
      const courseId = moduleToCourse.get(moduleId);
      if (courseId) quizCourseMap[quiz.id] = courseId;
      continue;
    }
    if (quiz.module_id) {
      const courseId = moduleToCourse.get(quiz.module_id);
      if (courseId) quizCourseMap[quiz.id] = courseId;
    }
  }

  return quizCourseMap;
};

const getCourseCompletionMap = (courses, modules, lessons, progressRows) => {
  const lessonsByCourseId = mapLessonsByCourseId(modules, lessons);
  const completedLessonSet = new Set(
    (progressRows || [])
      .filter((row) => row.is_completed)
      .map((row) => row.lesson_id)
  );

  const completionMap = {};
  for (const course of courses) {
    const courseLessons = lessonsByCourseId[course.id] || [];
    if (!courseLessons.length) {
      completionMap[course.id] = 0;
      continue;
    }

    const completedCount = courseLessons.filter((lesson) =>
      completedLessonSet.has(lesson.id)
    ).length;
    completionMap[course.id] = Math.round((completedCount / courseLessons.length) * 100);
  }
  return completionMap;
};

export const getTrainingDashboardStats = async () => {
  try {
    const [{ data: courses, error: coursesError }, { data: attempts, error: attemptsError }, { count: enrollmentCount, error: enrollmentError }] =
      await Promise.all([
        supabase.from(TABLES.TRAINING_COURSES).select('id,status'),
        supabase.from(TABLES.TRAINING_QUIZ_ATTEMPTS).select('id,score,pass'),
        supabase
          .from(TABLES.TRAINING_ENROLLMENTS)
          .select('*', { count: 'exact', head: true }),
      ]);

    if (coursesError) return handleSupabaseError(coursesError);
    if (attemptsError) return handleSupabaseError(attemptsError);
    if (enrollmentError) return handleSupabaseError(enrollmentError);

    const safeAttempts = attempts || [];
    const totalScore = safeAttempts.reduce(
      (sum, attempt) => sum + Number(attempt.score || 0),
      0
    );
    const passedAttempts = safeAttempts.filter((attempt) => attempt.pass).length;

    return handleSupabaseSuccess({
      totalCourses: (courses || []).length,
      publishedCourses: (courses || []).filter((course) => course.status === 'published').length,
      draftCourses: (courses || []).filter((course) => course.status !== 'published').length,
      totalEnrollments: enrollmentCount || 0,
      totalAttempts: safeAttempts.length,
      averageScore: safeAttempts.length ? Math.round(totalScore / safeAttempts.length) : 0,
      passRate: safeAttempts.length
        ? Math.round((passedAttempts / safeAttempts.length) * 100)
        : 0,
    });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getAllTrainingCourses = async ({ includeDraft = true } = {}) => {
  try {
    let query = supabase
      .from(TABLES.TRAINING_COURSES)
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeDraft) query = query.eq('status', 'published');

    const { data, error } = await query;
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess((data || []).map(normalizeCourseRow));
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getTrainingCourseById = async (courseId) => {
  try {
    const { data: course, error: courseError } = await supabase
      .from(TABLES.TRAINING_COURSES)
      .select('*')
      .eq('id', courseId)
      .single();
    if (courseError) return handleSupabaseError(courseError);

    const { data: modules, error: moduleError } = await supabase
      .from(TABLES.TRAINING_MODULES)
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true });
    if (moduleError) return handleSupabaseError(moduleError);

    const moduleIds = unique((modules || []).map((module) => module.id));
    let lessons = [];
    if (moduleIds.length > 0) {
      const { data: lessonRows, error: lessonError } = await supabase
        .from(TABLES.TRAINING_LESSONS)
        .select('*')
        .in('module_id', moduleIds)
        .order('sort_order', { ascending: true });
      if (lessonError) return handleSupabaseError(lessonError);
      lessons = lessonRows || [];
    }

    const lessonIds = unique(lessons.map((lesson) => lesson.id));
    let quizzes = [];

    if (moduleIds.length > 0) {
      const { data: moduleQuizzes, error: moduleQuizError } = await supabase
        .from(TABLES.TRAINING_QUIZZES)
        .select('*')
        .in('module_id', moduleIds);
      if (moduleQuizError) return handleSupabaseError(moduleQuizError);
      quizzes = quizzes.concat(moduleQuizzes || []);
    }

    if (lessonIds.length > 0) {
      const { data: lessonQuizzes, error: lessonQuizError } = await supabase
        .from(TABLES.TRAINING_QUIZZES)
        .select('*')
        .in('lesson_id', lessonIds);
      if (lessonQuizError) return handleSupabaseError(lessonQuizError);
      quizzes = quizzes.concat(lessonQuizzes || []);
    }

    quizzes = quizzes.filter(
      (quiz, index, array) => array.findIndex((item) => item.id === quiz.id) === index
    );

    const quizIds = unique(quizzes.map((quiz) => quiz.id));
    let questions = [];
    if (quizIds.length > 0) {
      const { data: questionRows, error: questionError } = await supabase
        .from(TABLES.TRAINING_QUIZ_QUESTIONS)
        .select('*')
        .in('quiz_id', quizIds)
        .order('id', { ascending: true });
      if (questionError) return handleSupabaseError(questionError);
      questions = questionRows || [];
    }

    const questionsByQuiz = {};
    for (const question of questions) {
      if (!questionsByQuiz[question.quiz_id]) questionsByQuiz[question.quiz_id] = [];
      questionsByQuiz[question.quiz_id].push(normalizeQuestionRow(question));
    }

    const moduleQuizzesByModuleId = {};
    const lessonQuizzesByLessonId = {};
    for (const quiz of quizzes) {
      const normalizedQuiz = {
        ...quiz,
        pass_mark: Number(quiz.pass_mark || 50),
        time_limit_seconds: quiz.time_limit_seconds ? Number(quiz.time_limit_seconds) : null,
        questions: questionsByQuiz[quiz.id] || [],
      };

      if (quiz.module_id) moduleQuizzesByModuleId[quiz.module_id] = normalizedQuiz;
      if (quiz.lesson_id) lessonQuizzesByLessonId[quiz.lesson_id] = normalizedQuiz;
    }

    const lessonsByModuleId = {};
    for (const lesson of lessons) {
      if (!lessonsByModuleId[lesson.module_id]) lessonsByModuleId[lesson.module_id] = [];
      lessonsByModuleId[lesson.module_id].push({
        ...normalizeLessonRow(lesson),
        quiz: lessonQuizzesByLessonId[lesson.id] || null,
      });
    }

    const courseTree = {
      ...normalizeCourseRow(course),
      modules: (modules || []).sort(bySortOrder).map((module) => ({
        ...module,
        lessons: (lessonsByModuleId[module.id] || []).sort(bySortOrder),
        quiz: moduleQuizzesByModuleId[module.id] || null,
      })),
    };

    return handleSupabaseSuccess(courseTree);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const saveTrainingCourse = async (courseData, createdBy) => {
  try {
    const payload = {
      title: courseData.title?.trim(),
      description: courseData.description || '',
      cover_url: courseData.cover_url || null,
      category: courseData.category || null,
      difficulty: courseData.difficulty || 'beginner',
      estimated_minutes: Number(courseData.estimated_minutes || 0),
      status: courseData.status || DEFAULT_COURSE_STATUS,
      updated_at: new Date().toISOString(),
    };

    if (!payload.title) return { success: false, error: 'Course title is required.' };

    if (courseData.id) {
      const { data, error } = await supabase
        .from(TABLES.TRAINING_COURSES)
        .update(payload)
        .eq('id', courseData.id)
        .select('*')
        .single();
      if (error) return handleSupabaseError(error);
      return handleSupabaseSuccess(normalizeCourseRow(data));
    }

    const { data, error } = await supabase
      .from(TABLES.TRAINING_COURSES)
      .insert([{ ...payload, created_by: createdBy || null }])
      .select('*')
      .single();
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(normalizeCourseRow(data));
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const saveTrainingModule = async (moduleData) => {
  try {
    const payload = {
      course_id: moduleData.course_id,
      title: moduleData.title?.trim(),
      sort_order: Number(moduleData.sort_order || 0),
    };

    if (!payload.course_id || !payload.title) {
      return { success: false, error: 'Module course_id and title are required.' };
    }

    if (moduleData.id) {
      const { data, error } = await supabase
        .from(TABLES.TRAINING_MODULES)
        .update(payload)
        .eq('id', moduleData.id)
        .select('*')
        .single();
      if (error) return handleSupabaseError(error);
      return handleSupabaseSuccess(data);
    }

    const { data, error } = await supabase
      .from(TABLES.TRAINING_MODULES)
      .insert([payload])
      .select('*')
      .single();
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const reorderTrainingModules = async (courseId, orderedModuleIds) => {
  try {
    const updates = orderedModuleIds.map((id, index) =>
      supabase
        .from(TABLES.TRAINING_MODULES)
        .update({ sort_order: index + 1 })
        .eq('id', id)
        .eq('course_id', courseId)
    );
    await Promise.all(updates);
    return handleSupabaseSuccess(true);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const saveTrainingLesson = async (lessonData) => {
  try {
    const lessonType = lessonData.lesson_type || LESSON_TYPES.CONTENT;
    const payload = {
      module_id: lessonData.module_id,
      title: lessonData.title?.trim(),
      lesson_type: lessonType,
      sort_order: Number(lessonData.sort_order || 0),
      content_html: lessonType === LESSON_TYPES.CONTENT ? lessonData.content_html || '' : null,
      video_url: lessonType === LESSON_TYPES.VIDEO ? lessonData.video_url || '' : null,
      resources_json:
        lessonType === LESSON_TYPES.RESOURCES
          ? JSON.stringify(normalizeArray(lessonData.resources_json))
          : null,
    };

    if (!payload.module_id || !payload.title) {
      return { success: false, error: 'Lesson module_id and title are required.' };
    }

    if (lessonData.id) {
      const { data, error } = await supabase
        .from(TABLES.TRAINING_LESSONS)
        .update(payload)
        .eq('id', lessonData.id)
        .select('*')
        .single();
      if (error) return handleSupabaseError(error);
      return handleSupabaseSuccess(normalizeLessonRow(data));
    }

    const { data, error } = await supabase
      .from(TABLES.TRAINING_LESSONS)
      .insert([payload])
      .select('*')
      .single();
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(normalizeLessonRow(data));
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const reorderTrainingLessons = async (moduleId, orderedLessonIds) => {
  try {
    const updates = orderedLessonIds.map((id, index) =>
      supabase
        .from(TABLES.TRAINING_LESSONS)
        .update({ sort_order: index + 1 })
        .eq('id', id)
        .eq('module_id', moduleId)
    );
    await Promise.all(updates);
    return handleSupabaseSuccess(true);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const saveTrainingQuiz = async (quizData) => {
  try {
    const payload = {
      title: quizData.title?.trim(),
      pass_mark: Number(quizData.pass_mark || 50),
      time_limit_seconds: quizData.time_limit_seconds
        ? Number(quizData.time_limit_seconds)
        : null,
      module_id: quizData.module_id || null,
      lesson_id: quizData.lesson_id || null,
    };

    if (!payload.title) return { success: false, error: 'Quiz title is required.' };
    if (!payload.module_id && !payload.lesson_id) {
      return { success: false, error: 'Quiz must target a module or lesson.' };
    }

    if (quizData.id) {
      const { data, error } = await supabase
        .from(TABLES.TRAINING_QUIZZES)
        .update(payload)
        .eq('id', quizData.id)
        .select('*')
        .single();
      if (error) return handleSupabaseError(error);
      return handleSupabaseSuccess(data);
    }

    const { data, error } = await supabase
      .from(TABLES.TRAINING_QUIZZES)
      .insert([payload])
      .select('*')
      .single();
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const deleteTrainingQuiz = async (quizId) => {
  try {
    await supabase.from(TABLES.TRAINING_QUIZ_QUESTIONS).delete().eq('quiz_id', quizId);
    await supabase.from(TABLES.TRAINING_QUIZ_ATTEMPTS).delete().eq('quiz_id', quizId);
    const { error } = await supabase.from(TABLES.TRAINING_QUIZZES).delete().eq('id', quizId);
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(true);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const saveTrainingQuizQuestion = async (questionData) => {
  try {
    const payload = {
      quiz_id: questionData.quiz_id,
      question_text: questionData.question_text?.trim(),
      question_type: questionData.question_type || 'single',
      options_json: questionData.options_json
        ? JSON.stringify(normalizeArray(questionData.options_json))
        : null,
      correct_answer_json:
        questionData.correct_answer_json != null
          ? JSON.stringify(questionData.correct_answer_json)
          : null,
      points: Number(questionData.points || 1),
    };

    if (!payload.quiz_id || !payload.question_text) {
      return { success: false, error: 'Question quiz_id and question_text are required.' };
    }

    if (questionData.id) {
      const { data, error } = await supabase
        .from(TABLES.TRAINING_QUIZ_QUESTIONS)
        .update(payload)
        .eq('id', questionData.id)
        .select('*')
        .single();
      if (error) return handleSupabaseError(error);
      return handleSupabaseSuccess(normalizeQuestionRow(data));
    }

    const { data, error } = await supabase
      .from(TABLES.TRAINING_QUIZ_QUESTIONS)
      .insert([payload])
      .select('*')
      .single();
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(normalizeQuestionRow(data));
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const deleteTrainingQuizQuestion = async (questionId) => {
  try {
    const { error } = await supabase
      .from(TABLES.TRAINING_QUIZ_QUESTIONS)
      .delete()
      .eq('id', questionId);
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(true);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const deleteTrainingLesson = async (lessonId) => {
  try {
    const { data: quizzes } = await supabase
      .from(TABLES.TRAINING_QUIZZES)
      .select('id')
      .eq('lesson_id', lessonId);

    const quizIds = unique((quizzes || []).map((quiz) => quiz.id));
    if (quizIds.length) {
      await supabase.from(TABLES.TRAINING_QUIZ_QUESTIONS).delete().in('quiz_id', quizIds);
      await supabase.from(TABLES.TRAINING_QUIZ_ATTEMPTS).delete().in('quiz_id', quizIds);
      await supabase.from(TABLES.TRAINING_QUIZZES).delete().in('id', quizIds);
    }

    await supabase.from(TABLES.TRAINING_PROGRESS).delete().eq('lesson_id', lessonId);
    const { error } = await supabase
      .from(TABLES.TRAINING_LESSONS)
      .delete()
      .eq('id', lessonId);
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(true);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const deleteTrainingModule = async (moduleId) => {
  try {
    const { data: lessons, error: lessonError } = await supabase
      .from(TABLES.TRAINING_LESSONS)
      .select('id')
      .eq('module_id', moduleId);
    if (lessonError) return handleSupabaseError(lessonError);

    const lessonIds = unique((lessons || []).map((lesson) => lesson.id));

    const { data: moduleQuizzes } = await supabase
      .from(TABLES.TRAINING_QUIZZES)
      .select('id')
      .eq('module_id', moduleId);
    const moduleQuizIds = unique((moduleQuizzes || []).map((quiz) => quiz.id));

    if (lessonIds.length) {
      const { data: lessonQuizzes } = await supabase
        .from(TABLES.TRAINING_QUIZZES)
        .select('id')
        .in('lesson_id', lessonIds);
      const lessonQuizIds = unique((lessonQuizzes || []).map((quiz) => quiz.id));
      const allQuizIds = unique(moduleQuizIds.concat(lessonQuizIds));

      if (allQuizIds.length) {
        await supabase.from(TABLES.TRAINING_QUIZ_QUESTIONS).delete().in('quiz_id', allQuizIds);
        await supabase.from(TABLES.TRAINING_QUIZ_ATTEMPTS).delete().in('quiz_id', allQuizIds);
        await supabase.from(TABLES.TRAINING_QUIZZES).delete().in('id', allQuizIds);
      }

      await supabase.from(TABLES.TRAINING_PROGRESS).delete().in('lesson_id', lessonIds);
      await supabase.from(TABLES.TRAINING_LESSONS).delete().in('id', lessonIds);
    } else if (moduleQuizIds.length) {
      await supabase.from(TABLES.TRAINING_QUIZ_QUESTIONS).delete().in('quiz_id', moduleQuizIds);
      await supabase.from(TABLES.TRAINING_QUIZ_ATTEMPTS).delete().in('quiz_id', moduleQuizIds);
      await supabase.from(TABLES.TRAINING_QUIZZES).delete().in('id', moduleQuizIds);
    }

    const { error } = await supabase
      .from(TABLES.TRAINING_MODULES)
      .delete()
      .eq('id', moduleId);
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(true);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const deleteTrainingCourse = async (courseId) => {
  try {
    const { data: modules, error: moduleError } = await supabase
      .from(TABLES.TRAINING_MODULES)
      .select('id')
      .eq('course_id', courseId);
    if (moduleError) return handleSupabaseError(moduleError);

    for (const module of modules || []) {
      const deleteResult = await deleteTrainingModule(module.id);
      if (!deleteResult.success) return deleteResult;
    }

    await supabase.from(TABLES.TRAINING_ENROLLMENTS).delete().eq('course_id', courseId);

    const { error } = await supabase
      .from(TABLES.TRAINING_COURSES)
      .delete()
      .eq('id', courseId);
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(true);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const assignTrainingCourse = async ({
  courseId,
  userIds,
  assignedBy,
  dueDate = null,
}) => {
  try {
    const cleanUserIds = unique(userIds);
    if (!courseId || cleanUserIds.length === 0) {
      return { success: false, error: 'courseId and userIds are required.' };
    }

    const { data: existingRows, error: existingError } = await supabase
      .from(TABLES.TRAINING_ENROLLMENTS)
      .select('user_id')
      .eq('course_id', courseId)
      .in('user_id', cleanUserIds);
    if (existingError) return handleSupabaseError(existingError);

    const existingUserIds = new Set((existingRows || []).map((row) => row.user_id));
    const rowsToInsert = cleanUserIds
      .filter((userId) => !existingUserIds.has(userId))
      .map((userId) => ({
        user_id: userId,
        course_id: courseId,
        assigned_by: assignedBy || null,
        assigned_at: new Date().toISOString(),
        due_date: dueDate || null,
        status: 'assigned',
      }));

    if (!rowsToInsert.length) {
      return handleSupabaseSuccess({ inserted: 0, skipped: cleanUserIds.length });
    }

    const { error } = await supabase
      .from(TABLES.TRAINING_ENROLLMENTS)
      .insert(rowsToInsert);
    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess({
      inserted: rowsToInsert.length,
      skipped: cleanUserIds.length - rowsToInsert.length,
    });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getTrainingEmployees = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('id,name,email,department,position')
      .order('name', { ascending: true });
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(data || []);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getEmployeeTrainingCourses = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'userId is required.' };

    const [
      { data: enrollments, error: enrollmentError },
      { data: courses, error: courseError },
    ] = await Promise.all([
      supabase
        .from(TABLES.TRAINING_ENROLLMENTS)
        .select('*')
        .eq('user_id', userId)
        .order('assigned_at', { ascending: false }),
      supabase
        .from(TABLES.TRAINING_COURSES)
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
    ]);

    if (enrollmentError) return handleSupabaseError(enrollmentError);
    if (courseError) return handleSupabaseError(courseError);

    const courseIds = unique((courses || []).map((course) => course.id));
    let modules = [];
    let lessons = [];

    if (courseIds.length) {
      const { data: moduleRows, error: moduleError } = await supabase
        .from(TABLES.TRAINING_MODULES)
        .select('*')
        .in('course_id', courseIds);
      if (moduleError) return handleSupabaseError(moduleError);
      modules = moduleRows || [];

      const moduleIds = unique(modules.map((module) => module.id));
      if (moduleIds.length) {
        const { data: lessonRows, error: lessonError } = await supabase
          .from(TABLES.TRAINING_LESSONS)
          .select('*')
          .in('module_id', moduleIds);
        if (lessonError) return handleSupabaseError(lessonError);
        lessons = lessonRows || [];
      }
    }

    const lessonIds = unique(lessons.map((lesson) => lesson.id));
    let progress = [];
    if (lessonIds.length) {
      const { data: progressRows, error: progressError } = await supabase
        .from(TABLES.TRAINING_PROGRESS)
        .select('*')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);
      if (progressError) return handleSupabaseError(progressError);
      progress = progressRows || [];
    }

    const completionMap = getCourseCompletionMap(courses || [], modules, lessons, progress);
    const enrollmentByCourseId = {};
    for (const enrollment of enrollments || []) {
      enrollmentByCourseId[enrollment.course_id] = enrollment;
    }

    const coursesWithProgress = (courses || []).map((course) => {
      const enrollment = enrollmentByCourseId[course.id] || null;
      const completion = completionMap[course.id] || 0;
      let status = 'available';
      if (enrollment) status = enrollment.status || 'assigned';
      if (completion === 100) status = 'completed';
      else if (completion > 0 && status !== 'completed') status = 'in_progress';

      return {
        ...normalizeCourseRow(course),
        completion_percent: completion,
        enrollment,
        employee_status: status,
      };
    });

    return handleSupabaseSuccess(coursesWithProgress);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getTrainingCoursePlayerData = async (courseId, userId) => {
  try {
    const courseResult = await getTrainingCourseById(courseId);
    if (!courseResult.success) return courseResult;

    const course = courseResult.data;
    const lessonIds = unique(
      course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id))
    );
    const quizIds = unique(
      course.modules.flatMap((module) => {
        const moduleQuizIds = module.quiz ? [module.quiz.id] : [];
        const lessonQuizIds = module.lessons
          .filter((lesson) => lesson.quiz)
          .map((lesson) => lesson.quiz.id);
        return moduleQuizIds.concat(lessonQuizIds);
      })
    );

    let progressRows = [];
    if (lessonIds.length) {
      const { data, error } = await supabase
        .from(TABLES.TRAINING_PROGRESS)
        .select('*')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);
      if (error) return handleSupabaseError(error);
      progressRows = data || [];
    }

    let attemptRows = [];
    if (quizIds.length) {
      const { data, error } = await supabase
        .from(TABLES.TRAINING_QUIZ_ATTEMPTS)
        .select('*')
        .eq('user_id', userId)
        .in('quiz_id', quizIds)
        .order('submitted_at', { ascending: false });
      if (error) return handleSupabaseError(error);
      attemptRows = data || [];
    }

    const progressByLessonId = {};
    for (const row of progressRows) progressByLessonId[row.lesson_id] = row;

    const attemptsByQuizId = {};
    for (const row of attemptRows) {
      if (!attemptsByQuizId[row.quiz_id]) attemptsByQuizId[row.quiz_id] = [];
      attemptsByQuizId[row.quiz_id].push(row);
    }

    const enhancedModules = course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        progress: progressByLessonId[lesson.id] || null,
        latest_attempt: lesson.quiz ? (attemptsByQuizId[lesson.quiz.id] || [])[0] || null : null,
      })),
      latest_attempt: module.quiz ? (attemptsByQuizId[module.quiz.id] || [])[0] || null : null,
    }));

    return handleSupabaseSuccess({ ...course, modules: enhancedModules });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const saveTrainingLessonProgress = async ({
  userId,
  lessonId,
  isCompleted = false,
  lastPositionSeconds = null,
}) => {
  try {
    const { data: existing, error: existingError } = await supabase
      .from(TABLES.TRAINING_PROGRESS)
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (existingError) return handleSupabaseError(existingError);

    const payload = {
      user_id: userId,
      lesson_id: lessonId,
      is_completed: Boolean(isCompleted),
      completed_at: isCompleted ? new Date().toISOString() : null,
      last_position_seconds:
        lastPositionSeconds == null ? null : Number(lastPositionSeconds || 0),
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from(TABLES.TRAINING_PROGRESS)
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) return handleSupabaseError(error);
      return handleSupabaseSuccess(data);
    }

    const { data, error } = await supabase
      .from(TABLES.TRAINING_PROGRESS)
      .insert([payload])
      .select('*')
      .single();
    if (error) return handleSupabaseError(error);
    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const submitTrainingQuizAttempt = async ({ userId, quizId, answers }) => {
  try {
    const { data: quiz, error: quizError } = await supabase
      .from(TABLES.TRAINING_QUIZZES)
      .select('*')
      .eq('id', quizId)
      .single();
    if (quizError) return handleSupabaseError(quizError);

    const { data: questions, error: questionError } = await supabase
      .from(TABLES.TRAINING_QUIZ_QUESTIONS)
      .select('*')
      .eq('quiz_id', quizId)
      .order('id', { ascending: true });
    if (questionError) return handleSupabaseError(questionError);

    const normalizedQuestions = (questions || []).map(normalizeQuestionRow);
    let earnedPoints = 0;
    let totalPoints = 0;
    const grading = [];

    for (const question of normalizedQuestions) {
      const submitted = answers?.[question.id];
      const correct = isAnswerCorrect(question, submitted);
      const points = Number(question.points || 1);
      totalPoints += points;
      if (correct) earnedPoints += points;

      grading.push({
        question_id: question.id,
        submitted_answer: submitted ?? null,
        is_correct: correct,
        earned_points: correct ? points : 0,
        points,
      });
    }

    const score = totalPoints ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const pass = score >= Number(quiz.pass_mark || 50);

    const { data: attempt, error: attemptError } = await supabase
      .from(TABLES.TRAINING_QUIZ_ATTEMPTS)
      .insert([
        {
          user_id: userId,
          quiz_id: quizId,
          started_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          score,
          pass,
          answers_json: JSON.stringify({
            answers: answers || {},
            grading,
            earned_points: earnedPoints,
            total_points: totalPoints,
          }),
        },
      ])
      .select('*')
      .single();
    if (attemptError) return handleSupabaseError(attemptError);

    return handleSupabaseSuccess({
      attempt,
      score,
      pass,
      earnedPoints,
      totalPoints,
      passMark: Number(quiz.pass_mark || 50),
    });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getEmployeeTrainingResults = async (userId) => {
  try {
    const [
      { data: enrollments, error: enrollmentError },
      { data: attempts, error: attemptsError },
      { data: courses, error: courseError },
    ] = await Promise.all([
      supabase.from(TABLES.TRAINING_ENROLLMENTS).select('*').eq('user_id', userId),
      supabase
        .from(TABLES.TRAINING_QUIZ_ATTEMPTS)
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false }),
      supabase.from(TABLES.TRAINING_COURSES).select('*'),
    ]);

    if (enrollmentError) return handleSupabaseError(enrollmentError);
    if (attemptsError) return handleSupabaseError(attemptsError);
    if (courseError) return handleSupabaseError(courseError);

    const courseIds = unique((courses || []).map((course) => course.id));
    let modules = [];
    let lessons = [];
    if (courseIds.length) {
      const { data: moduleRows, error: moduleError } = await supabase
        .from(TABLES.TRAINING_MODULES)
        .select('*')
        .in('course_id', courseIds);
      if (moduleError) return handleSupabaseError(moduleError);
      modules = moduleRows || [];

      const moduleIds = unique(modules.map((module) => module.id));
      if (moduleIds.length) {
        const { data: lessonRows, error: lessonError } = await supabase
          .from(TABLES.TRAINING_LESSONS)
          .select('*')
          .in('module_id', moduleIds);
        if (lessonError) return handleSupabaseError(lessonError);
        lessons = lessonRows || [];
      }
    }

    const lessonIds = unique(lessons.map((lesson) => lesson.id));
    let progressRows = [];
    if (lessonIds.length) {
      const { data: progress, error: progressError } = await supabase
        .from(TABLES.TRAINING_PROGRESS)
        .select('*')
        .eq('user_id', userId)
        .in('lesson_id', lessonIds);
      if (progressError) return handleSupabaseError(progressError);
      progressRows = progress || [];
    }

    const quizIds = unique((attempts || []).map((attempt) => attempt.quiz_id));
    let quizzes = [];
    if (quizIds.length) {
      const { data: quizRows, error: quizError } = await supabase
        .from(TABLES.TRAINING_QUIZZES)
        .select('*')
        .in('id', quizIds);
      if (quizError) return handleSupabaseError(quizError);
      quizzes = quizRows || [];
    }

    const completionMap = getCourseCompletionMap(courses || [], modules, lessons, progressRows);
    const courseById = {};
    for (const course of courses || []) courseById[course.id] = normalizeCourseRow(course);

    const quizCourseMap = buildQuizCourseMap(quizzes, modules, lessons);
    const latestAttemptByCourse = {};
    const attemptsByCourse = {};

    for (const attempt of attempts || []) {
      const courseId = quizCourseMap[attempt.quiz_id];
      if (!courseId) continue;
      if (!attemptsByCourse[courseId]) attemptsByCourse[courseId] = [];
      attemptsByCourse[courseId].push(attempt);
      if (!latestAttemptByCourse[courseId]) latestAttemptByCourse[courseId] = attempt;
    }

    const enrollmentByCourse = {};
    for (const enrollment of enrollments || []) {
      enrollmentByCourse[enrollment.course_id] = enrollment;
    }

    const completionDateByCourse = {};
    const moduleById = new Map(modules.map((module) => [module.id, module]));
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    for (const row of progressRows || []) {
      if (!row.is_completed || !row.completed_at) continue;
      const lesson = lessonById.get(row.lesson_id);
      if (!lesson) continue;
      const module = moduleById.get(lesson.module_id);
      if (!module) continue;
      const courseId = module.course_id;
      const currentDate = completionDateByCourse[courseId];
      if (!currentDate || new Date(row.completed_at) > new Date(currentDate)) {
        completionDateByCourse[courseId] = row.completed_at;
      }
    }

    const trackedCourseIds = unique(
      (enrollments || [])
        .map((item) => item.course_id)
        .concat(Object.keys(latestAttemptByCourse).map(Number))
    );

    const results = trackedCourseIds
      .map((courseId) => {
        const course = courseById[courseId];
        if (!course) return null;
        const latestAttempt = latestAttemptByCourse[courseId] || null;
        const attemptCount = (attemptsByCourse[courseId] || []).length;
        const completion = completionMap[courseId] || 0;
        return {
          course_id: courseId,
          course_title: course.title,
          completion_percent: completion,
          completion_date: completion === 100 ? completionDateByCourse[courseId] || null : null,
          latest_score: latestAttempt ? Number(latestAttempt.score || 0) : null,
          pass_status: latestAttempt ? Boolean(latestAttempt.pass) : null,
          attempts: attemptCount,
          enrollment_status: enrollmentByCourse[courseId]?.status || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.course_title.localeCompare(b.course_title));

    return handleSupabaseSuccess(results);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getTrainingReports = async () => {
  try {
    const [
      { data: courses, error: courseError },
      { data: enrollments, error: enrollmentError },
      { data: modules, error: moduleError },
      { data: lessons, error: lessonError },
      { data: progressRows, error: progressError },
      { data: quizzes, error: quizError },
      { data: attempts, error: attemptError },
    ] = await Promise.all([
      supabase.from(TABLES.TRAINING_COURSES).select('*').order('created_at', { ascending: false }),
      supabase.from(TABLES.TRAINING_ENROLLMENTS).select('*'),
      supabase.from(TABLES.TRAINING_MODULES).select('*'),
      supabase.from(TABLES.TRAINING_LESSONS).select('*'),
      supabase.from(TABLES.TRAINING_PROGRESS).select('*'),
      supabase.from(TABLES.TRAINING_QUIZZES).select('*'),
      supabase.from(TABLES.TRAINING_QUIZ_ATTEMPTS).select('*'),
    ]);

    if (courseError) return handleSupabaseError(courseError);
    if (enrollmentError) return handleSupabaseError(enrollmentError);
    if (moduleError) return handleSupabaseError(moduleError);
    if (lessonError) return handleSupabaseError(lessonError);
    if (progressError) return handleSupabaseError(progressError);
    if (quizError) return handleSupabaseError(quizError);
    if (attemptError) return handleSupabaseError(attemptError);

    const moduleById = new Map((modules || []).map((module) => [module.id, module]));
    const lessonById = new Map((lessons || []).map((lesson) => [lesson.id, lesson]));
    const quizCourseMap = buildQuizCourseMap(quizzes || [], modules || [], lessons || []);

    const courseUsersStarted = {};
    const courseUsersCompleted = {};
    for (const row of progressRows || []) {
      const lesson = lessonById.get(row.lesson_id);
      if (!lesson) continue;
      const module = moduleById.get(lesson.module_id);
      if (!module) continue;
      const courseId = module.course_id;

      if (!courseUsersStarted[courseId]) courseUsersStarted[courseId] = new Set();
      courseUsersStarted[courseId].add(row.user_id);

      if (row.is_completed) {
        if (!courseUsersCompleted[courseId]) courseUsersCompleted[courseId] = new Set();
        courseUsersCompleted[courseId].add(row.user_id);
      }
    }

    const attemptsByCourse = {};
    for (const attempt of attempts || []) {
      const courseId = quizCourseMap[attempt.quiz_id];
      if (!courseId) continue;
      if (!attemptsByCourse[courseId]) attemptsByCourse[courseId] = [];
      attemptsByCourse[courseId].push(attempt);
    }

    const enrollmentsByCourse = {};
    for (const enrollment of enrollments || []) {
      if (!enrollmentsByCourse[enrollment.course_id]) enrollmentsByCourse[enrollment.course_id] = [];
      enrollmentsByCourse[enrollment.course_id].push(enrollment);
    }

    const rows = (courses || []).map((course) => {
      const courseAttempts = attemptsByCourse[course.id] || [];
      const totalScore = courseAttempts.reduce(
        (sum, attempt) => sum + Number(attempt.score || 0),
        0
      );
      const passCount = courseAttempts.filter((attempt) => attempt.pass).length;
      const startedUsers = courseUsersStarted[course.id] || new Set();
      const completedUsers = courseUsersCompleted[course.id] || new Set();
      const enrollmentRows = enrollmentsByCourse[course.id] || [];

      return {
        course_id: course.id,
        title: course.title,
        status: course.status,
        enrollments: enrollmentRows.length,
        started: startedUsers.size,
        completed: completedUsers.size,
        average_score: courseAttempts.length
          ? Math.round(totalScore / courseAttempts.length)
          : 0,
        attempts: courseAttempts.length,
        pass_rate: courseAttempts.length
          ? Math.round((passCount / courseAttempts.length) * 100)
          : 0,
      };
    });

    return handleSupabaseSuccess(rows);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

export const getTrainingEmployeeReports = async () => {
  try {
    const [
      { data: employees, error: employeeError },
      { data: courses, error: courseError },
      { data: enrollments, error: enrollmentError },
      { data: modules, error: moduleError },
      { data: lessons, error: lessonError },
      { data: progressRows, error: progressError },
      { data: quizzes, error: quizError },
      { data: attempts, error: attemptError },
    ] = await Promise.all([
      supabase.from(TABLES.EMPLOYEES).select('id,name,email,department'),
      supabase.from(TABLES.TRAINING_COURSES).select('id,title,status'),
      supabase.from(TABLES.TRAINING_ENROLLMENTS).select('*'),
      supabase.from(TABLES.TRAINING_MODULES).select('id,course_id'),
      supabase.from(TABLES.TRAINING_LESSONS).select('id,module_id'),
      supabase.from(TABLES.TRAINING_PROGRESS).select('*'),
      supabase.from(TABLES.TRAINING_QUIZZES).select('id,lesson_id,module_id'),
      supabase.from(TABLES.TRAINING_QUIZ_ATTEMPTS).select('*'),
    ]);

    if (employeeError) return handleSupabaseError(employeeError);
    if (courseError) return handleSupabaseError(courseError);
    if (enrollmentError) return handleSupabaseError(enrollmentError);
    if (moduleError) return handleSupabaseError(moduleError);
    if (lessonError) return handleSupabaseError(lessonError);
    if (progressError) return handleSupabaseError(progressError);
    if (quizError) return handleSupabaseError(quizError);
    if (attemptError) return handleSupabaseError(attemptError);

    const employeeById = new Map((employees || []).map((employee) => [employee.id, employee]));
    const courseById = new Map((courses || []).map((course) => [course.id, course]));
    const moduleById = new Map((modules || []).map((module) => [module.id, module]));
    const lessonById = new Map((lessons || []).map((lesson) => [lesson.id, lesson]));
    const lessonsByCourse = mapLessonsByCourseId(modules || [], lessons || []);
    const quizCourseMap = buildQuizCourseMap(quizzes || [], modules || [], lessons || []);

    const completedLessonSetByUser = {};
    const completedAtByUserCourse = {};
    const progressExistsByUserCourse = {};

    for (const row of progressRows || []) {
      const lesson = lessonById.get(row.lesson_id);
      if (!lesson) continue;
      const module = moduleById.get(lesson.module_id);
      if (!module) continue;
      const courseId = module.course_id;
      const userId = row.user_id;
      const key = `${userId}-${courseId}`;

      progressExistsByUserCourse[key] = true;

      if (row.is_completed) {
        if (!completedLessonSetByUser[userId]) {
          completedLessonSetByUser[userId] = new Set();
        }
        completedLessonSetByUser[userId].add(row.lesson_id);

        if (row.completed_at) {
          const existing = completedAtByUserCourse[key];
          if (!existing || new Date(row.completed_at) > new Date(existing)) {
            completedAtByUserCourse[key] = row.completed_at;
          }
        }
      }
    }

    const attemptsByUserCourse = {};
    for (const attempt of attempts || []) {
      const courseId = quizCourseMap[attempt.quiz_id];
      if (!courseId) continue;
      const key = `${attempt.user_id}-${courseId}`;
      if (!attemptsByUserCourse[key]) attemptsByUserCourse[key] = [];
      attemptsByUserCourse[key].push(attempt);
    }

    for (const key of Object.keys(attemptsByUserCourse)) {
      attemptsByUserCourse[key].sort((a, b) => {
        const left = new Date(a.submitted_at || a.started_at || 0).getTime();
        const right = new Date(b.submitted_at || b.started_at || 0).getTime();
        return right - left;
      });
    }

    const todayText = new Date().toISOString().split('T')[0];

    const rows = (enrollments || [])
      .map((enrollment) => {
        const employee = employeeById.get(enrollment.user_id);
        const course = courseById.get(enrollment.course_id);
        if (!employee || !course) return null;

        const key = `${enrollment.user_id}-${enrollment.course_id}`;
        const attemptsForRow = attemptsByUserCourse[key] || [];
        const latestAttempt = attemptsForRow[0] || null;
        const completedLessonSet = completedLessonSetByUser[enrollment.user_id] || new Set();
        const courseLessons = lessonsByCourse[enrollment.course_id] || [];
        const completedCount = courseLessons.filter((lesson) =>
          completedLessonSet.has(lesson.id)
        ).length;
        const completionPercent = courseLessons.length
          ? Math.round((completedCount / courseLessons.length) * 100)
          : 0;

        let status = enrollment.status || 'assigned';
        if (completionPercent === 100) status = 'completed';
        else if (completionPercent > 0) status = 'in_progress';

        const overdue =
          Boolean(enrollment.due_date) &&
          completionPercent < 100 &&
          String(enrollment.due_date) < todayText;

        return {
          user_id: employee.id,
          employee_name: employee.name,
          employee_email: employee.email,
          department: employee.department || null,
          course_id: course.id,
          course_title: course.title,
          course_status: course.status,
          assigned_at: enrollment.assigned_at || null,
          due_date: enrollment.due_date || null,
          completion_percent: completionPercent,
          completion_date: completionPercent === 100 ? completedAtByUserCourse[key] || null : null,
          attempts: attemptsForRow.length,
          latest_score: latestAttempt ? Number(latestAttempt.score || 0) : null,
          pass_status: latestAttempt ? Boolean(latestAttempt.pass) : null,
          status,
          overdue,
          has_started: Boolean(progressExistsByUserCourse[key] || attemptsForRow.length > 0),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const employeeCompare = String(a.employee_name || '').localeCompare(
          String(b.employee_name || '')
        );
        if (employeeCompare !== 0) return employeeCompare;
        return String(a.course_title || '').localeCompare(String(b.course_title || ''));
      });

    return handleSupabaseSuccess(rows);
  } catch (error) {
    return handleSupabaseError(error);
  }
};
