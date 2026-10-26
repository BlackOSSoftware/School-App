import React from 'react';
import { Alert } from 'react-native';
import { act, create } from 'react-test-renderer';
import TeacherContentScreen from '../src/components/teacher/TeacherContentScreen';
import { useTeacherHomeworkMutations, useTeacherMyContentQuery } from '../src/hooks/useContentQueries';

jest.setTimeout(15000);

jest.mock('@react-native-documents/picker', () => ({ errorCodes: {}, types: {} }));
jest.mock('../src/components/common/AppIcon', () => 'AppIcon');
jest.mock('../src/components/common/CustomDropdownSelector', () => 'Dropdown');
jest.mock('../src/components/common/KeyboardAwareModal', () => 'KeyboardAwareModal');
jest.mock('../src/services/fileService', () => ({ openContentFile: jest.fn() }));
jest.mock('../src/hooks/useTeacherQueries', () => ({ useTeacherClassesOverviewQuery: () => ({ data: {} }) }));
jest.mock('../src/hooks/useContentQueries', () => ({
  useCreateTeacherContentMutation: () => ({}),
  useTeacherMyContentQuery: jest.fn(),
  useTeacherHomeworkMutations: jest.fn(),
}));

const homework = { id: 'hw1', type: 'homework', title: 'Math homework', subject: 'MATH', description: 'Read chapter 1', createdAt: '2026-09-06' };
let screen;
let update;
let remove;
beforeEach(() => {
  update = { mutateAsync: jest.fn().mockResolvedValue({ success: true }), isPending: false };
  remove = { mutateAsync: jest.fn().mockResolvedValue({ success: true }), isPending: false };
  useTeacherHomeworkMutations.mockReturnValue({ update, remove });
  useTeacherMyContentQuery.mockReturnValue({ data: { data: [homework], totalPages: 1 } });
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  screen = null;
  jest.restoreAllMocks();
});

test('teacher can open editor, validate required fields and save homework', async () => {
  await act(async () => { screen = create(<TeacherContentScreen />); });
  await act(async () => screen.root.findByProps({ accessibilityLabel: 'Edit Math homework' }).props.onPress());
  await act(async () => screen.root.findByProps({ accessibilityLabel: 'Homework title' }).props.onChangeText(''));
  await act(async () => screen.root.findByProps({ accessibilityLabel: 'Save homework' }).props.onPress());
  expect(update.mutateAsync).not.toHaveBeenCalled();
  await act(async () => screen.root.findByProps({ accessibilityLabel: 'Homework title' }).props.onChangeText('Updated homework'));
  await act(async () => screen.root.findByProps({ accessibilityLabel: 'Save homework' }).props.onPress());
  expect(update.mutateAsync).toHaveBeenCalledWith({
    id: 'hw1',
    type: 'homework',
    title: 'Updated homework',
    subject: 'MATH',
    description: 'Read chapter 1',
    file: null,
    removeFile: false,
  });
});

test('delete waits for confirmation', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await act(async () => { screen = create(<TeacherContentScreen />); });
  await act(async () => screen.root.findByProps({ accessibilityLabel: 'Delete Math homework' }).props.onPress());
  expect(remove.mutateAsync).not.toHaveBeenCalled();
  const actions = alert.mock.calls[0][2];
  expect(actions[0].style).toBe('cancel');
  await act(async () => actions.find(action => action.text === 'Delete').onPress());
  expect(remove.mutateAsync).toHaveBeenCalledWith({ id: 'hw1', type: 'homework' });
});

test('teacher can edit and delete notes', async () => {
  useTeacherMyContentQuery.mockReturnValue({
    data: { data: [{ ...homework, type: 'notes', title: 'Math notes' }], totalPages: 1 },
  });
  await act(async () => { screen = create(<TeacherContentScreen />); });
  await act(async () => screen.root.findByProps({ accessibilityLabel: 'Edit Math notes' }).props.onPress());
  await act(async () => screen.root.findByProps({ accessibilityLabel: 'Save notes' }).props.onPress());
  expect(update.mutateAsync).toHaveBeenCalledWith({
    id: 'hw1',
    type: 'notes',
    title: 'Math notes',
    subject: 'MATH',
    description: 'Read chapter 1',
    file: null,
    removeFile: false,
  });

  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await act(async () => screen.root.findByProps({ accessibilityLabel: 'Delete Math notes' }).props.onPress());
  const actions = alert.mock.calls[0][2];
  await act(async () => actions.find(action => action.text === 'Delete').onPress());
  expect(remove.mutateAsync).toHaveBeenCalledWith({ id: 'hw1', type: 'notes' });
});
