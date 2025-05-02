import React from 'react';

function SessionButtons({ sessions, currentSession, onSelect, disabledSessions }) {
  return (
    <div className="session-buttons">
      {sessions.map(session => (
        <button
          key={session}
          disabled={disabledSessions.includes(session)}
          className={session === currentSession ? 'active' : ''}
          onClick={() => onSelect(session)}
        >
          {session.replace('_', ' ')}
        </button>
      ))}
    </div>
  );
}

export default SessionButtons;
