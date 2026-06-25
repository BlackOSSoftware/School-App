export const EXAM_TYPE_OPTIONS = [
  'Monthly Test',
  'Quarterly Exam',
  'Half-Yearly Exam',
  'Annual Exam',
];

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

export function buildAutoExamTitle(examType, month) {
  if (examType === 'Monthly Test' && month) {
    return `${month} Monthly Test`;
  }
  return String(examType || '').trim();
}
