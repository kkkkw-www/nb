import { useTranslation } from '@nocobase/i18n/client';
import { PageContainer } from '#components/page-container';

export default function AutomationTestingPage() {
  const { t } = useTranslation();
  return <PageContainer aria-label={t('automationTesting.title')} />;
}
