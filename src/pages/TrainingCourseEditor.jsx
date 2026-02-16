import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Save, Trash2 } from 'lucide-react';
import {
  deleteTrainingLesson,
  deleteTrainingModule,
  deleteTrainingQuiz,
  deleteTrainingQuizQuestion,
  getTrainingCourseById,
  reorderTrainingLessons,
  reorderTrainingModules,
  saveTrainingCourse,
  saveTrainingLesson,
  saveTrainingModule,
  saveTrainingQuiz,
  saveTrainingQuizQuestion,
} from '../services/trainingService';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Loading from '../components/common/Loading';

const STEPS = ['Course', 'Modules', 'Lessons', 'Quiz', 'Publish'];
const emptyCourse = {
  title: '',
  description: '',
  cover_url: '',
  category: '',
  difficulty: 'beginner',
  estimated_minutes: 0,
  status: 'draft',
};
const emptyLesson = { id: null, title: '', lesson_type: 'content', content_html: '', video_url: '', resources_text: '' };
const emptyQuiz = { id: null, title: '', pass_mark: 60, time_limit_seconds: '' };
const emptyQuestion = { id: null, question_text: '', question_type: 'single', options_text: '', correct_answer_text: '', points: 1 };

const toResourceText = (rows) => (rows || []).map((r) => `${r.title || ''}|${r.url || ''}`).join('\n');
const fromResourceText = (value) => value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
  const [title, url] = line.split('|');
  return { title: (title || '').trim(), url: (url || '').trim() };
}).filter((row) => row.title && row.url);

export default function TrainingCourseEditor() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user } = useAuth();
  const { showError, showSuccess } = useApp();

  const [loading, setLoading] = useState(Boolean(courseId));
  const [step, setStep] = useState(0);
  const [course, setCourse] = useState(emptyCourse);
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [lesson, setLesson] = useState(emptyLesson);
  const [quizTargetType, setQuizTargetType] = useState('module');
  const [quizTargetId, setQuizTargetId] = useState(null);
  const [quiz, setQuiz] = useState(emptyQuiz);
  const [question, setQuestion] = useState(emptyQuestion);

  const selectedModule = useMemo(() => modules.find((m) => m.id === selectedModuleId) || null, [modules, selectedModuleId]);
  const lessonTargets = useMemo(
    () => modules.flatMap((module) => (module.lessons || []).map((entry) => ({ id: entry.id, label: `${module.title}: ${entry.title}` }))),
    [modules]
  );
  const activeQuiz = useMemo(() => {
    if (!quizTargetId) return null;
    if (quizTargetType === 'module') return modules.find((m) => m.id === quizTargetId)?.quiz || null;
    return modules.flatMap((m) => m.lessons || []).find((l) => l.id === quizTargetId)?.quiz || null;
  }, [modules, quizTargetType, quizTargetId]);

  useEffect(() => {
    if (!activeQuiz) {
      setQuiz(emptyQuiz);
      setQuestion(emptyQuestion);
      return;
    }
    setQuiz({
      id: activeQuiz.id,
      title: activeQuiz.title || '',
      pass_mark: activeQuiz.pass_mark || 60,
      time_limit_seconds: activeQuiz.time_limit_seconds || '',
    });
  }, [activeQuiz?.id]);

  const loadCourse = async (id) => {
    const result = await getTrainingCourseById(Number(id));
    if (!result.success) {
      showError(result.error || 'Failed to load course.');
      setLoading(false);
      return;
    }
    const row = result.data;
    setCourse({
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      cover_url: row.cover_url || '',
      category: row.category || '',
      difficulty: row.difficulty || 'beginner',
      estimated_minutes: row.estimated_minutes || 0,
      status: row.status || 'draft',
    });
    setModules(row.modules || []);
    setSelectedModuleId(row.modules?.[0]?.id || null);
    setLoading(false);
  };

  useEffect(() => {
    if (courseId) loadCourse(courseId);
  }, [courseId]);

  const refresh = async () => {
    if (course.id) await loadCourse(course.id);
  };

  const ensureCourse = async () => {
    if (course.id) return course.id;
    const result = await saveTrainingCourse(course, user?.id);
    if (!result.success) {
      showError(result.error || 'Save the course details first.');
      return null;
    }
    setCourse((prev) => ({ ...prev, id: result.data.id }));
    return result.data.id;
  };

  const saveDetails = async () => {
    const result = await saveTrainingCourse(course, user?.id);
    if (!result.success) return showError(result.error || 'Failed to save course details.');
    setCourse((prev) => ({ ...prev, id: result.data.id, status: result.data.status }));
    showSuccess('Course details saved.');
  };

  const addModule = async () => {
    const title = window.prompt('Module title');
    if (!title?.trim()) return;
    const courseRef = await ensureCourse();
    if (!courseRef) return;
    const result = await saveTrainingModule({ course_id: courseRef, title: title.trim(), sort_order: modules.length + 1 });
    if (!result.success) return showError(result.error || 'Failed to add module.');
    showSuccess('Module added.');
    refresh();
  };

  const moveModule = async (index, direction) => {
    const next = index + direction;
    if (next < 0 || next >= modules.length) return;
    const order = [...modules];
    [order[index], order[next]] = [order[next], order[index]];
    const result = await reorderTrainingModules(course.id, order.map((m) => m.id));
    if (!result.success) return showError(result.error || 'Failed to reorder modules.');
    refresh();
  };

  const addOrUpdateLesson = async () => {
    if (!selectedModuleId) return showError('Select a module.');
    const result = await saveTrainingLesson({
      id: lesson.id,
      module_id: selectedModuleId,
      title: lesson.title,
      lesson_type: lesson.lesson_type,
      content_html: lesson.content_html,
      video_url: lesson.video_url,
      resources_json: fromResourceText(lesson.resources_text),
      sort_order: lesson.id ? selectedModule?.lessons?.find((row) => row.id === lesson.id)?.sort_order || 1 : (selectedModule?.lessons || []).length + 1,
    });
    if (!result.success) return showError(result.error || 'Failed to save lesson.');
    setLesson(emptyLesson);
    showSuccess('Lesson saved.');
    refresh();
  };

  const moveLesson = async (index, direction) => {
    if (!selectedModule) return;
    const next = index + direction;
    if (next < 0 || next >= selectedModule.lessons.length) return;
    const order = [...selectedModule.lessons];
    [order[index], order[next]] = [order[next], order[index]];
    const result = await reorderTrainingLessons(selectedModule.id, order.map((l) => l.id));
    if (!result.success) return showError(result.error || 'Failed to reorder lessons.');
    refresh();
  };

  const saveQuiz = async () => {
    if (!quizTargetId) return showError('Select a module or lesson target.');
    const result = await saveTrainingQuiz({
      id: quiz.id,
      title: quiz.title,
      pass_mark: Number(quiz.pass_mark || 60),
      time_limit_seconds: quiz.time_limit_seconds ? Number(quiz.time_limit_seconds) : null,
      module_id: quizTargetType === 'module' ? quizTargetId : null,
      lesson_id: quizTargetType === 'lesson' ? quizTargetId : null,
    });
    if (!result.success) return showError(result.error || 'Failed to save quiz.');
    showSuccess('Quiz saved.');
    refresh();
  };

  const saveQuestion = async () => {
    if (!activeQuiz?.id) return showError('Save quiz first.');
    const options = question.options_text.split('\n').map((line) => line.trim()).filter(Boolean);
    const correct = question.question_type === 'multi'
      ? question.correct_answer_text.split(',').map((item) => item.trim()).filter(Boolean)
      : question.question_type === 'truefalse'
      ? question.correct_answer_text.trim().toLowerCase() === 'true'
      : question.correct_answer_text;
    const result = await saveTrainingQuizQuestion({
      id: question.id,
      quiz_id: activeQuiz.id,
      question_text: question.question_text,
      question_type: question.question_type,
      options_json: question.question_type === 'short' ? [] : options,
      correct_answer_json: correct,
      points: Number(question.points || 1),
    });
    if (!result.success) return showError(result.error || 'Failed to save question.');
    setQuestion(emptyQuestion);
    showSuccess('Question saved.');
    refresh();
  };

  const publishCourse = async () => {
    if (!course.id) return showError('Save course details first.');
    const result = await saveTrainingCourse({ ...course, status: 'published' }, user?.id);
    if (!result.success) return showError(result.error || 'Failed to publish course.');
    showSuccess('Course published.');
    setCourse((prev) => ({ ...prev, status: 'published' }));
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Course Editor</h1>
          <p className="text-sm text-gray-600 mt-1">{course.title || 'New course'}</p>
        </div>
        <button onClick={() => navigate('/training/admin')} className="px-3 py-2 border rounded-lg hover:bg-gray-50 w-full sm:w-auto">Back</button>
      </div>

      <div className="bg-white rounded-lg shadow p-3 flex flex-wrap gap-2">
        {STEPS.map((label, idx) => (
          <button key={label} onClick={() => setStep(idx)} className={`px-3 py-2 rounded-lg text-sm ${step === idx ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
            {idx + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <section className="bg-white rounded-lg shadow p-4 space-y-3">
          <EditorField label="Title"><input className="w-full border rounded-lg px-3 py-2" value={course.title} onChange={(e) => setCourse((p) => ({ ...p, title: e.target.value }))} /></EditorField>
          <EditorField label="Description"><textarea rows="5" className="w-full border rounded-lg px-3 py-2" value={course.description} onChange={(e) => setCourse((p) => ({ ...p, description: e.target.value }))} /></EditorField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <EditorField label="Category"><input className="w-full border rounded-lg px-3 py-2" value={course.category} onChange={(e) => setCourse((p) => ({ ...p, category: e.target.value }))} /></EditorField>
            <EditorField label="Cover URL"><input className="w-full border rounded-lg px-3 py-2" value={course.cover_url} onChange={(e) => setCourse((p) => ({ ...p, cover_url: e.target.value }))} /></EditorField>
            <EditorField label="Difficulty"><select className="w-full border rounded-lg px-3 py-2" value={course.difficulty} onChange={(e) => setCourse((p) => ({ ...p, difficulty: e.target.value }))}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></EditorField>
            <EditorField label="Estimated minutes"><input type="number" className="w-full border rounded-lg px-3 py-2" value={course.estimated_minutes} onChange={(e) => setCourse((p) => ({ ...p, estimated_minutes: Number(e.target.value || 0) }))} /></EditorField>
          </div>
          <button onClick={saveDetails} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"><Save className="w-4 h-4" />Save Details</button>
        </section>
      )}

      {step === 1 && (
        <section className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex justify-between items-center"><h2 className="font-semibold text-gray-900">Modules</h2><button onClick={addModule} className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 inline-flex items-center gap-1"><Plus className="w-4 h-4" />Add</button></div>
          {(modules || []).map((module, idx) => (
            <div key={module.id} className="border rounded-lg p-3 flex items-center justify-between">
              <button onClick={() => setSelectedModuleId(module.id)} className={`text-left ${selectedModuleId === module.id ? 'text-purple-700 font-semibold' : 'text-gray-800'}`}>{module.title}</button>
              <div className="flex gap-2">
                <button onClick={() => moveModule(idx, -1)} className="px-2 py-1 border rounded">Up</button>
                <button onClick={() => moveModule(idx, 1)} className="px-2 py-1 border rounded">Down</button>
                <button onClick={async () => { if (!window.confirm('Delete module?')) return; const result = await deleteTrainingModule(module.id); if (!result.success) return showError(result.error || 'Failed'); showSuccess('Module deleted.'); refresh(); }} className="px-2 py-1 border border-red-300 text-red-700 rounded">Delete</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {step === 2 && (
        <section className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">Lessons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <EditorField label="Module"><select className="w-full border rounded-lg px-3 py-2" value={selectedModuleId || ''} onChange={(e) => setSelectedModuleId(Number(e.target.value) || null)}><option value="">Select module</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></EditorField>
            <EditorField label="Title"><input className="w-full border rounded-lg px-3 py-2" value={lesson.title} onChange={(e) => setLesson((p) => ({ ...p, title: e.target.value }))} /></EditorField>
            <EditorField label="Type"><select className="w-full border rounded-lg px-3 py-2" value={lesson.lesson_type} onChange={(e) => setLesson((p) => ({ ...p, lesson_type: e.target.value }))}><option value="content">Content</option><option value="video">Video</option><option value="resources">Resources</option></select></EditorField>
          </div>
          {lesson.lesson_type === 'content' && <EditorField label="Content"><textarea rows="4" className="w-full border rounded-lg px-3 py-2" value={lesson.content_html} onChange={(e) => setLesson((p) => ({ ...p, content_html: e.target.value }))} /></EditorField>}
          {lesson.lesson_type === 'video' && <EditorField label="Video URL"><input className="w-full border rounded-lg px-3 py-2" value={lesson.video_url} onChange={(e) => setLesson((p) => ({ ...p, video_url: e.target.value }))} /></EditorField>}
          {lesson.lesson_type === 'resources' && <EditorField label="Resources (title|url per line)"><textarea rows="4" className="w-full border rounded-lg px-3 py-2" value={lesson.resources_text} onChange={(e) => setLesson((p) => ({ ...p, resources_text: e.target.value }))} /></EditorField>}
          <div className="flex gap-2"><button onClick={addOrUpdateLesson} className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">{lesson.id ? 'Update' : 'Add'} Lesson</button><button onClick={() => setLesson(emptyLesson)} className="px-3 py-2 border rounded-lg">Clear</button></div>
          <div className="space-y-2">{(selectedModule?.lessons || []).map((row, idx) => <div key={row.id} className="border rounded-lg p-2 flex items-center justify-between"><div><p className="text-sm font-medium">{row.title}</p><p className="text-xs text-gray-500">{row.lesson_type}</p></div><div className="flex gap-2"><button onClick={() => moveLesson(idx, -1)} className="px-2 py-1 border rounded">Up</button><button onClick={() => moveLesson(idx, 1)} className="px-2 py-1 border rounded">Down</button><button onClick={() => setLesson({ id: row.id, title: row.title || '', lesson_type: row.lesson_type || 'content', content_html: row.content_html || '', video_url: row.video_url || '', resources_text: toResourceText(row.resources_json || []) })} className="px-2 py-1 border rounded">Edit</button><button onClick={async () => { if (!window.confirm('Delete lesson?')) return; const result = await deleteTrainingLesson(row.id); if (!result.success) return showError(result.error || 'Failed'); showSuccess('Lesson deleted.'); refresh(); }} className="px-2 py-1 border border-red-300 text-red-700 rounded">Delete</button></div></div>)}</div>
        </section>
      )}

      {step === 3 && (
        <section className="bg-white rounded-lg shadow p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Quiz</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <EditorField label="Target Type"><select className="w-full border rounded-lg px-3 py-2" value={quizTargetType} onChange={(e) => { setQuizTargetType(e.target.value); setQuizTargetId(null); }}><option value="module">Module</option><option value="lesson">Lesson</option></select></EditorField>
            <EditorField label="Target"><select className="w-full border rounded-lg px-3 py-2" value={quizTargetId || ''} onChange={(e) => setQuizTargetId(Number(e.target.value) || null)}><option value="">Select target</option>{quizTargetType === 'module' ? modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>) : lessonTargets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></EditorField>
            <EditorField label="Quiz Title"><input className="w-full border rounded-lg px-3 py-2" value={quiz.title} onChange={(e) => setQuiz((p) => ({ ...p, title: e.target.value }))} /></EditorField>
            <EditorField label="Pass Mark"><input type="number" className="w-full border rounded-lg px-3 py-2" value={quiz.pass_mark} onChange={(e) => setQuiz((p) => ({ ...p, pass_mark: Number(e.target.value || 0) }))} /></EditorField>
            <EditorField label="Time Limit Seconds"><input type="number" className="w-full border rounded-lg px-3 py-2" value={quiz.time_limit_seconds} onChange={(e) => setQuiz((p) => ({ ...p, time_limit_seconds: e.target.value }))} /></EditorField>
          </div>
          <div className="flex gap-2"><button onClick={saveQuiz} className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">Save Quiz</button>{activeQuiz && <button onClick={async () => { if (!window.confirm('Delete quiz?')) return; const result = await deleteTrainingQuiz(activeQuiz.id); if (!result.success) return showError(result.error || 'Failed'); showSuccess('Quiz deleted.'); refresh(); }} className="px-3 py-2 border border-red-300 text-red-700 rounded-lg">Delete Quiz</button>}</div>
          <div className="border-t pt-3 space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Questions</h3>
            <EditorField label="Question Text"><textarea rows="3" className="w-full border rounded-lg px-3 py-2" value={question.question_text} onChange={(e) => setQuestion((p) => ({ ...p, question_text: e.target.value }))} /></EditorField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <EditorField label="Type"><select className="w-full border rounded-lg px-3 py-2" value={question.question_type} onChange={(e) => setQuestion((p) => ({ ...p, question_type: e.target.value }))}><option value="single">Single</option><option value="multi">Multi</option><option value="truefalse">True/False</option><option value="short">Short</option></select></EditorField>
              <EditorField label="Points"><input type="number" className="w-full border rounded-lg px-3 py-2" value={question.points} onChange={(e) => setQuestion((p) => ({ ...p, points: Number(e.target.value || 1) }))} /></EditorField>
            </div>
            {question.question_type !== 'short' && <EditorField label="Options (one per line)"><textarea rows="3" className="w-full border rounded-lg px-3 py-2" value={question.options_text} onChange={(e) => setQuestion((p) => ({ ...p, options_text: e.target.value }))} /></EditorField>}
            <EditorField label={question.question_type === 'multi' ? 'Correct Answers (comma-separated)' : 'Correct Answer'}><input className="w-full border rounded-lg px-3 py-2" value={question.correct_answer_text} onChange={(e) => setQuestion((p) => ({ ...p, correct_answer_text: e.target.value }))} /></EditorField>
            <div className="flex gap-2"><button onClick={saveQuestion} className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">{question.id ? 'Update' : 'Add'} Question</button><button onClick={() => setQuestion(emptyQuestion)} className="px-3 py-2 border rounded-lg">Clear</button></div>
            {(activeQuiz?.questions || []).map((row) => <div key={row.id} className="border rounded-lg px-3 py-2 flex items-center justify-between"><div><p className="text-sm font-medium">{row.question_text}</p><p className="text-xs text-gray-500">{row.question_type} • {row.points} pts</p></div><div className="flex gap-2"><button onClick={() => setQuestion({ id: row.id, question_text: row.question_text || '', question_type: row.question_type || 'single', options_text: (row.options_json || []).join('\n'), correct_answer_text: Array.isArray(row.correct_answer_json) ? row.correct_answer_json.join(', ') : String(row.correct_answer_json ?? ''), points: row.points || 1 })} className="px-2 py-1 border rounded">Edit</button><button onClick={async () => { const result = await deleteTrainingQuizQuestion(row.id); if (!result.success) return showError(result.error || 'Failed'); showSuccess('Question deleted.'); refresh(); }} className="px-2 py-1 border border-red-300 text-red-700 rounded">Delete</button></div></div>)}
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="bg-white rounded-lg shadow p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Publish</h2>
          <p className="text-sm text-gray-600">Modules: {modules.length} • Lessons: {modules.reduce((sum, m) => sum + (m.lessons || []).length, 0)}</p>
          <p className="text-sm text-gray-600">Current status: <span className="font-medium">{course.status || 'draft'}</span></p>
          <button onClick={publishCourse} className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Publish Course</button>
        </section>
      )}

      <div className="flex justify-between">
        <button disabled={step === 0} onClick={() => setStep((p) => Math.max(0, p - 1))} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50"><ArrowLeft className="w-4 h-4" />Previous</button>
        <button disabled={step === STEPS.length - 1} onClick={() => setStep((p) => Math.min(STEPS.length - 1, p + 1))} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50">Next<ArrowRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function EditorField({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700 font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
