export const EXAM_TYPE_OPTIONS = [
  'Periodic Test',
  'Term - 1',
  'Term - 2',
  'Surprise Test',
];

export const EXAM_TYPES_NEEDING_MONTH = ['Periodic Test', 'Surprise Test'];

export const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function examNeedsMonth(examType) {
  return EXAM_TYPES_NEEDING_MONTH.includes(String(examType || '').trim());
}

/** Subjects used for marksheet entry (excludes meta labels like ALL). */
export function getMarksheetSubjects(subjects = []) {
  return (Array.isArray(subjects) ? subjects : [])
    .map(item => String(item ?? '').trim())
    .filter(Boolean)
    .filter(item => item.toUpperCase() !== 'ALL');
}

export function buildAutoExamTitle(examType, month) {
  const type = String(examType || '').trim();
  if (examNeedsMonth(type) && month) {
    return `${month} ${type}`;
  }
  return type;
}

export function formatSubjectScore(item) {
  if (item?.isAbsent) return 'A';
  const marks = item?.marks;
  if (marks === null || marks === undefined || marks === '') return '-';
  return String(marks);
}

export function getResultTotalOutOf(result) {
  if (Number.isFinite(Number(result?.totalOutOf)) && Number(result.totalOutOf) > 0) {
    return Number(result.totalOutOf);
  }
  const subjects = Array.isArray(result?.subjectMarks) ? result.subjectMarks : [];
  if (subjects.length) {
    return subjects.reduce((sum, item) => sum + Number(item?.outOf || result?.outOf || 0), 0);
  }
  return Number(result?.outOf || 0);
}
