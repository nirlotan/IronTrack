import { useLocalSearchParams } from 'expo-router';
import { TemplateEditor } from '../src/components/TemplateEditor';

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TemplateEditor templateId={id} />;
}
