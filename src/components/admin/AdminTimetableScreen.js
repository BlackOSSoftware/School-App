import React, { useMemo } from 'react';
import TimetableScreen from '../common/TimetableScreen';
import { useClassesQuery } from '../../hooks/useClassQueries';

function getEntityId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const nested = value?._id ?? value?.id ?? value?.$oid ?? '';
    if (typeof nested === 'string') return nested.trim();
  }
  return '';
}

function getClassLabel(value) {
  const name = String(value?.name ?? '').trim();
  const section = String(value?.section ?? '').trim();
  return `${name}${section ? ` - ${section}` : ''}`.trim();
}

export default function AdminTimetableScreen() {
  const classesQuery = useClassesQuery(1, 200);
  const classOptions = useMemo(() => {
    const rows = Array.isArray(classesQuery.data?.data) ? classesQuery.data.data : [];
    return rows.map(item => ({
      id: getEntityId(item),
      label: getClassLabel(item),
    })).filter(item => item.id);
  }, [classesQuery.data?.data]);

  return <TimetableScreen tone="admin" role="admin" classOptions={classOptions} />;
}
