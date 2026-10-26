import React, { useMemo } from 'react';
import TimetableScreen from '../common/TimetableScreen';
import { useTeacherClassesOverviewQuery } from '../../hooks/useTeacherQueries';

export default function TeacherTimetableScreen() {
  const overviewQuery = useTeacherClassesOverviewQuery();
  const assigned = overviewQuery.data?.assignedClasses?.[0] || overviewQuery.data?.teacher?.classTeacherOf || null;
  const assignedClassId = useMemo(() => {
    if (!assigned) return '';
    if (typeof assigned === 'string') return assigned;
    return String(assigned?.id || assigned?._id || '');
  }, [assigned]);
  const assignedClassLabel = useMemo(() => {
    if (!assigned || typeof assigned === 'string') return '';
    return assigned.label || `${assigned.name || ''}${assigned.section ? ` - ${assigned.section}` : ''}`.trim();
  }, [assigned]);

  return (
    <TimetableScreen
      tone="teacher"
      role="teacher"
      assignedClassId={assignedClassId}
      assignedClassLabel={assignedClassLabel}
    />
  );
}
