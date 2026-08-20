import { useEffect, useMemo, useState } from 'react';
import { publicApi } from '../lib/api';
import { REALTIME_EVENTS, subscribeToRealtime } from '../lib/realtime';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../lib/translations';

export default function AnnouncementBar() {
  const { language } = useLanguage();
  const defaultAnnouncements = useMemo(
    () => [
      {
        text: t('announcement.defaultText', language),
        linkUrl: '/services',
        linkLabel: t('announcement.defaultLink', language),
      },
    ],
    [language]
  );
  const [announcementFeed, setAnnouncementFeed] = useState({ enabled: true, items: defaultAnnouncements, intervalSeconds: 5 });
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        const response = await publicApi.getAnnouncement();
        const receivedItems = Array.isArray(response.announcements) && response.announcements.length
          ? response.announcements
          : response.announcement?.text
            ? [response.announcement]
            : [];
        const backendItems = response.enabled === false ? [] : receivedItems;
        const items = [...defaultAnnouncements, ...backendItems].filter(
          (item, index, all) => item?.text && all.findIndex((entry) => entry?.text === item.text) === index
        );
        setAnnouncementFeed({
          enabled: true,
          items: items.slice(0, 5),
          intervalSeconds: Math.max(1, Number(response.intervalSeconds) || 5),
        });
      } catch {
        setAnnouncementFeed({ enabled: true, items: defaultAnnouncements, intervalSeconds: 5 });
      }
    };

    loadAnnouncement();
    return subscribeToRealtime([REALTIME_EVENTS.CATALOG_CHANGED, 'catalogChanged'], loadAnnouncement);
  }, [defaultAnnouncements]);

  useEffect(() => {
    if (!announcementFeed.enabled || announcementFeed.items.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setAnnouncementIndex((current) => (current + 1) % announcementFeed.items.length);
    }, announcementFeed.intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [announcementFeed]);

  const announcement = announcementFeed.items[announcementIndex] || null;
  if (!announcementFeed.enabled || !announcement?.text) return null;

  return (
    <div className="announcement-bar border-b border-blue-700/20 bg-primary text-white">
      <div className="mx-auto flex min-h-8 max-w-7xl items-center justify-center gap-2 px-4 py-1 text-center text-xs font-semibold">
        <BellIcon />
        <span>
          {announcement.text}
          {announcement.linkUrl && (
            <>
              {' '}
              <a href={announcement.linkUrl} className="font-black underline decoration-2 underline-offset-2">
                {announcement.linkLabel || t('announcement.learnMore', language)}
              </a>
            </>
          )}
        </span>
        {announcementFeed.items.length > 1 && <span className="whitespace-nowrap text-blue-100">{announcementIndex + 1}/{announcementFeed.items.length}</span>}
      </div>
    </div>
  );
}

function BellIcon() {
  return <svg className="h-4 w-4 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 01-6 0" /></svg>;
}
