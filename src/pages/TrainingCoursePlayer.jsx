import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ClipboardCheck,
  PlayCircle,
} from 'lucide-react';
import {
  getTrainingCoursePlayerData,
  saveTrainingLessonProgress,
  submitTrainingQuizAttempt,
} from '../services/trainingService';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Loading from '../components/common/Loading';

const toEmbedUrl = (url) => {
  if (!url) return '';
  const text = String(url).trim();
  if (text.includes('youtube.com/watch?v=')) {
    const videoId = text.split('v=')[1]?.split('&')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : text;
  }
  if (text.includes('youtu.be/')) {
    const videoId = text.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : text;
  }
  if (text.includes('vimeo.com/')) {
    const videoId = text.split('vimeo.com/')[1]?.split('?')[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : text;
  }
  return text;
};

const renderContent = (html) => {
  if (!html) return <p className="text-gray-600">No content provided.</p>;
  const looksLikeHtml = html.includes('<') && html.includes('>');
  if (!looksLikeHtml) {
    return <p className="text-gray-700 whitespace-pre-wrap leading-7">{html}</p>;
  }
  return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
};

const buildFlow = (course) => {
  const items = [];
  for (const module of course.modules || []) {
    for (const lesson of module.lessons || []) {
      items.push({
        id: `lesson-${lesson.id}`,
        type: 'lesson',
        moduleId: module.id,
        moduleTitle: module.title,
        title: lesson.title,
        lesson,
      });
      if (lesson.quiz) {
        items.push({
          id: `lesson-quiz-${lesson.quiz.id}`,
          type: 'quiz',
          moduleId: module.id,
          moduleTitle: module.title,
          title: `${lesson.title} Quiz`,
          quiz: {
            ...lesson.quiz,
            latest_attempt: lesson.latest_attempt || lesson.quiz?.latest_attempt || null,
          },
        });
      }
    }
    if (module.quiz) {
      items.push({
        id: `module-quiz-${module.quiz.id}`,
        type: 'quiz',
        moduleId: module.id,
        moduleTitle: module.title,
        title: `${module.title} Quiz`,
        quiz: {
          ...module.quiz,
          latest_attempt: module.latest_attempt || module.quiz?.latest_attempt || null,
        },
      });
    }
  }
  return items;
};

export default function TrainingCoursePlayer() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user } = useAuth();
  const { showError, showSuccess } = useApp();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [savingProgress, setSavingProgress] = useState(false);
  const [mobileFlowOpen, setMobileFlowOpen] = useState(false);

  const flow = useMemo(() => (course ? buildFlow(course) : []), [course]);
  const activeItem = flow[activeIndex] || null;

  const completionPercent = useMemo(() => {
    if (!course) return 0;
    const lessons = course.modules.flatMap((module) => module.lessons || []);
    if (!lessons.length) return 0;
    const completed = lessons.filter((lesson) => lesson.progress?.is_completed).length;
    return Math.round((completed / lessons.length) * 100);
  }, [course]);
  const activeFlowTitle = flow[activeIndex]?.title || '';

  const loadPlayer = async () => {
    if (!courseId || !user?.id) return;
    setLoading(true);
    const result = await getTrainingCoursePlayerData(Number(courseId), user.id);
    if (!result.success) {
      showError(result.error || 'Failed to load course.');
      setLoading(false);
      return;
    }
    const payload = result.data;
    setCourse(payload);

    const flowRows = buildFlow(payload);
    const firstIncomplete = flowRows.findIndex((row) => {
      if (row.type === 'lesson') return !row.lesson?.progress?.is_completed;
      if (row.type === 'quiz') return !row.quiz?.latest_attempt && !row.quiz?.latestAttempt;
      return false;
    });
    setActiveIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    setLoading(false);
  };

  useEffect(() => {
    loadPlayer();
  }, [courseId, user?.id]);

  const markLessonCompleted = async () => {
    if (activeItem?.type !== 'lesson') return;
    setSavingProgress(true);
    const result = await saveTrainingLessonProgress({
      userId: user.id,
      lessonId: activeItem.lesson.id,
      isCompleted: true,
    });
    setSavingProgress(false);
    if (!result.success) {
      showError(result.error || 'Failed to save progress.');
      return;
    }
    showSuccess('Lesson completed.');
    loadPlayer();
  };

  if (loading) return <Loading />;
  if (!course) return <div className="text-gray-600">Course not found.</div>;

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-sm text-gray-600 mt-1">{course.description || 'Training course'}</p>
        </div>
        <button
          onClick={() => navigate('/training')}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 w-full sm:w-auto"
        >
          Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Completion</span>
          <span className="font-semibold text-gray-900">{completionPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      <section className="xl:hidden bg-white rounded-lg shadow-md p-3">
        <button
          type="button"
          onClick={() => setMobileFlowOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="text-xs uppercase text-gray-500">Module / Lesson flow</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {activeFlowTitle || 'Select a lesson'}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-gray-600 shrink-0">
            {flow.length ? `${activeIndex + 1}/${flow.length}` : '0/0'}
            {mobileFlowOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {mobileFlowOpen ? (
          <div className="mt-3 max-h-[42vh] overflow-y-auto space-y-1 pr-1">
            {flow.map((item, index) => {
              const isActive = index === activeIndex;
              const completed =
                item.type === 'lesson'
                  ? item.lesson?.progress?.is_completed
                  : Boolean(item.quiz?.latest_attempt);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveIndex(index);
                    setMobileFlowOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg border ${
                    isActive
                      ? 'bg-purple-50 border-purple-300'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <p className="text-xs text-gray-500">{item.moduleTitle}</p>
                  <p className="text-sm text-gray-900 flex items-center gap-2">
                    {item.type === 'lesson' ? (
                      <BookOpen className="w-4 h-4 text-blue-500" />
                    ) : (
                      <ClipboardCheck className="w-4 h-4 text-purple-500" />
                    )}
                    {item.title}
                    {completed ? <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" /> : null}
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[320px,1fr] gap-4">
        <aside className="hidden xl:block bg-white rounded-lg shadow-md p-3 max-h-[70vh] overflow-y-auto">
          <p className="text-xs uppercase text-gray-500 px-2 mb-2">Module / Lesson flow</p>
          <div className="space-y-1">
            {flow.map((item, index) => {
              const isActive = index === activeIndex;
              const completed =
                item.type === 'lesson'
                  ? item.lesson?.progress?.is_completed
                  : Boolean(item.quiz?.latest_attempt);
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveIndex(index)}
                  className={`w-full text-left px-3 py-2 rounded-lg border ${
                    isActive
                      ? 'bg-purple-50 border-purple-300'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <p className="text-xs text-gray-500">{item.moduleTitle}</p>
                  <p className="text-sm text-gray-900 flex items-center gap-2">
                    {item.type === 'lesson' ? (
                      <BookOpen className="w-4 h-4 text-blue-500" />
                    ) : (
                      <ClipboardCheck className="w-4 h-4 text-purple-500" />
                    )}
                    {item.title}
                    {completed ? <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" /> : null}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="bg-white rounded-lg shadow-md p-4 md:p-5 min-h-[55vh] xl:min-h-[70vh]">
          {activeItem?.type === 'lesson' ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase text-gray-500">{activeItem.moduleTitle}</p>
                <h2 className="text-2xl font-semibold text-gray-900">{activeItem.title}</h2>
              </div>

              {activeItem.lesson.lesson_type === 'content' && (
                <section>{renderContent(activeItem.lesson.content_html)}</section>
              )}

              {activeItem.lesson.lesson_type === 'video' && (
                <section className="space-y-3">
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      title={activeItem.title}
                      src={toEmbedUrl(activeItem.lesson.video_url)}
                      className="w-full h-full"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <a
                    href={activeItem.lesson.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Open video in new tab
                  </a>
                </section>
              )}

              {activeItem.lesson.lesson_type === 'resources' && (
                <section className="space-y-2">
                  {(activeItem.lesson.resources_json || []).length === 0 ? (
                    <p className="text-gray-600">No resources yet.</p>
                  ) : (
                    (activeItem.lesson.resources_json || []).map((resource, idx) => (
                      <a
                        key={`${resource.url}-${idx}`}
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block border rounded-lg px-3 py-2 hover:bg-gray-50"
                      >
                        <p className="font-medium text-gray-900">{resource.title}</p>
                        <p className="text-xs text-blue-600 truncate">{resource.url}</p>
                      </a>
                    ))
                  )}
                </section>
              )}

              <button
                onClick={markLessonCompleted}
                disabled={savingProgress || activeItem.lesson.progress?.is_completed}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {activeItem.lesson.progress?.is_completed ? 'Completed' : 'Mark as complete'}
              </button>
            </div>
          ) : (
            <QuizRunner
              quiz={activeItem?.quiz}
              onSubmit={async (answers) => {
                const result = await submitTrainingQuizAttempt({
                  userId: user.id,
                  quizId: activeItem.quiz.id,
                  answers,
                });
                if (!result.success) {
                  showError(result.error || 'Failed to submit quiz.');
                  return { success: false };
                }
                showSuccess(`Quiz submitted. Score: ${result.data.score}%`);
                await loadPlayer();
                return { success: true, result: result.data };
              }}
            />
          )}
        </main>
      </div>

      <div className="flex justify-between">
        <button
          disabled={activeIndex === 0}
          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>
        <button
          disabled={activeIndex >= flow.length - 1}
          onClick={() => setActiveIndex((index) => Math.min(flow.length - 1, index + 1))}
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg disabled:opacity-50"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function QuizRunner({ quiz, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    setAnswers({});
    setLatest(quiz?.latest_attempt || null);
  }, [quiz?.id]);

  if (!quiz) return <p className="text-gray-600">No quiz configured for this step.</p>;

  const updateAnswer = (question, value) => {
    if (question.question_type !== 'multi') {
      setAnswers((prev) => ({ ...prev, [question.id]: value }));
      return;
    }
    setAnswers((prev) => {
      const current = Array.isArray(prev[question.id]) ? prev[question.id] : [];
      const exists = current.includes(value);
      const next = exists ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [question.id]: next };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PlayCircle className="w-5 h-5 text-purple-600" />
        <h2 className="text-2xl font-semibold text-gray-900">{quiz.title}</h2>
      </div>
      <p className="text-sm text-gray-600">
        Pass mark: {quiz.pass_mark}% {quiz.time_limit_seconds ? `• Time limit: ${quiz.time_limit_seconds}s` : ''}
      </p>

      {(quiz.questions || []).length === 0 ? (
        <p className="text-gray-600">This quiz has no questions yet.</p>
      ) : (
        quiz.questions.map((question, index) => (
          <div key={question.id} className="border rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-gray-900">
              {index + 1}. {question.question_text}
            </p>

            {question.question_type === 'truefalse' && (
              <div className="flex gap-2">
                {['true', 'false'].map((option) => (
                  <button
                    key={option}
                    onClick={() => updateAnswer(question, option === 'true')}
                    className={`px-3 py-1.5 border rounded ${
                      answers[question.id] === (option === 'true')
                        ? 'bg-purple-100 border-purple-300'
                        : ''
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {(question.question_type === 'single' || question.question_type === 'multi') && (
              <div className="space-y-1">
                {(question.options_json || []).map((option, optionIndex) => {
                  const selected =
                    question.question_type === 'single'
                      ? answers[question.id] === option
                      : (answers[question.id] || []).includes(option);
                  return (
                    <label
                      key={`${question.id}-${optionIndex}`}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type={question.question_type === 'single' ? 'radio' : 'checkbox'}
                        name={`question-${question.id}`}
                        checked={Boolean(selected)}
                        onChange={() => updateAnswer(question, option)}
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            )}

            {question.question_type === 'short' && (
              <input
                type="text"
                value={answers[question.id] || ''}
                onChange={(event) => updateAnswer(question, event.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Type your answer"
              />
            )}
          </div>
        ))
      )}

      <div className="flex items-center gap-3">
        <button
          disabled={submitting || (quiz.questions || []).length === 0}
          onClick={async () => {
            setSubmitting(true);
            const result = await onSubmit(answers);
            setSubmitting(false);
            if (result?.success) {
              setLatest(result.result?.attempt || null);
            }
          }}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
        {latest && (
          <span
            className={`text-sm font-medium ${
              latest.pass ? 'text-green-700' : 'text-red-700'
            }`}
          >
            Latest: {latest.score}% ({latest.pass ? 'Pass' : 'Fail'})
          </span>
        )}
      </div>
    </div>
  );
}
