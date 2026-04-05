import { Participant, Message, ParsedDiagram, ParticipantType } from '../types';

const PARTICIPANT_RE = /^\s*(participant|actor|database|entity)\s+"([^"]+)"(?:\s+as\s+(\w+))?/;
const PARTICIPANT_SIMPLE_RE = /^\s*(participant|actor|database|entity)\s+(\w+)(?:\s+as\s+(\w+))?/;
const MESSAGE_RE = /^\s*(\w+)\s*(<?-+>?)\s*(\w+)\s*:\s*(.+)$/;
const DELIMITER_RE = /^\s*@(startuml|enduml)/;
const COMMENT_RE = /^\s*'/;

function parseArrowStyle(arrow: string): { style: 'solid' | 'dashed'; reversed: boolean } {
  const dashes = arrow.replace(/[<>]/g, '');
  return {
    style: dashes.includes('--') ? 'dashed' : 'solid',
    reversed: arrow.startsWith('<'),
  };
}

export function parse(input: string): ParsedDiagram {
  const lines = input.split('\n');
  const participantMap = new Map<string, Participant>();
  const messages: Message[] = [];
  let participantOrder = 0;

  function ensureParticipant(name: string): void {
    if (!participantMap.has(name)) {
      participantMap.set(name, {
        name,
        alias: name,
        type: 'participant',
        order: participantOrder++,
      });
    }
  }

  for (const line of lines) {
    if (DELIMITER_RE.test(line) || COMMENT_RE.test(line) || line.trim() === '') {
      continue;
    }

    let match = PARTICIPANT_RE.exec(line) || PARTICIPANT_SIMPLE_RE.exec(line);
    if (match) {
      const type = match[1] as ParticipantType;
      const name = match[2];
      const alias = match[3] || name;
      if (!participantMap.has(alias)) {
        participantMap.set(alias, {
          name,
          alias,
          type,
          order: participantOrder++,
        });
      }
      continue;
    }

    match = MESSAGE_RE.exec(line);
    if (match) {
      const { style, reversed } = parseArrowStyle(match[2]);
      const left = match[1];
      const right = match[3];
      const from = reversed ? right : left;
      const to = reversed ? left : right;

      ensureParticipant(from);
      ensureParticipant(to);

      messages.push({
        from,
        to,
        label: match[4].trim(),
        arrowStyle: style,
        index: messages.length,
      });
    }
  }

  const participants = Array.from(participantMap.values()).sort(
    (a, b) => a.order - b.order
  );

  return { participants, messages };
}
