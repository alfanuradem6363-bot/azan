export interface MathQuestion {
  question: string;
  answer: number;
}

export type DownloadStatus = 'NOT_DOWNLOADED' | 'DOWNLOADING' | 'DOWNLOADED';

export interface AlarmSound {
  name: string;
  url: string;
}

export interface LibrarySound extends AlarmSound {
  status: DownloadStatus;
}
