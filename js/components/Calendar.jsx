import React from 'react';
import { useModel } from 'react-doura';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
import utc from 'dayjs/plugin/utc.js';

import { appStateModel, appStateModelName } from '../modules/state-manager';
import './calendar.css';

dayjs.extend(localizedFormat);
dayjs.extend(utc);

const formatGoogleTime = ts => dayjs(ts).utc().format('YYYYMMDD[T]HHmmss[Z]');

const renderGoogleCalendarUrl = event => {
  const startTime = formatGoogleTime(event.start);
  const endTime = event.end
    ? formatGoogleTime(event.end)
    : formatGoogleTime(dayjs(event.start).add(30, 'minute'));

  let googleCalendarUrl =
    'https://www.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(event.title)}` +
    `&dates=${startTime}/${endTime}`;

  if (event.description) {
    googleCalendarUrl += `&details=${encodeURIComponent(event.description)}`;
  }

  if (event.location) {
    googleCalendarUrl += `&location=${encodeURIComponent(event.location)}`;
  }
  return googleCalendarUrl;
};

export default function Calendar() {
  const { setCurrentView, groupCalendarEvents, fetchEarningsDates, fetchCalendarEvents } = useModel(
    appStateModelName,
    appStateModel
  );
  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h3>Calendar</h3>
        <button onClick={() => setCurrentView('main')} className="close-btn">
          ×
        </button>
      </div>
      <div className='calendar-actions'>
        <button onClick={fetchCalendarEvents}>economic events</button>
        <button onClick={fetchEarningsDates}>earnings date </button>
      </div>
      <div>
        {groupCalendarEvents.length === 0 ? (
          <div className="placeholder">No calendar events available.</div>
        ) : (
          groupCalendarEvents.map((group, index) => {
            const date = dayjs(group.events[0]?.start);
            return (
              <div className="calendar-group" key={index}>
                <div className="calendar-group-date">
                  <span>{date.format('dddd')}</span>
                  <span>{date.format('LL')}</span>
                </div>
                {group.events.map((event, idx) => {
                  const googleCalendarUrl = renderGoogleCalendarUrl(event);
                  return (
                    <a
                      href={googleCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="calendar-event"
                      title={event.description}
                      key={idx}
                    >
                      <div className="event-time">{dayjs(event.start).format('HH:mm')}</div>
                      <div className="event-title">{event.title}</div>
                    </a>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

