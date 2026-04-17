export const MOCK_COURSES = [
  {
    id: "course-1",
    title: "Legal Dictation Masterclass",
    description: "Master complex legal terminologies and fast-paced dictations.",
    price: 3499,
    levels: [
      {
        id: "level-normal",
        title: "Normal (60-80 WPM)",
        lessons: [
          {
            id: "lesson-1",
            title: "Basic Legal Terms",
            audioUrl: "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3", // placeholder
            timeMinutes: 1,
            passage: "The court finds the defendant guilty of all charges presented by the prosecution. It is evident that the contract was breached deliberately. We must ensure justice is served fairly and firmly without any prejudice."
          }
        ]
      },
      {
        id: "level-inter",
        title: "Intermediate (80-100 WPM)",
        lessons: [
          {
            id: "lesson-2",
            title: "Courtroom Proceedings",
            audioUrl: "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3",
            timeMinutes: 2,
            passage: "Objection your honor, the witness is being led by the prosecution. This testimony is entirely based on hearsay and should be stricken from the public record immediately. We request a brief recess to review the newly submitted evidence documents."
          }
        ]
      },
      {
        id: "level-adv",
        title: "Advanced (100-120 WPM)",
        lessons: [
          {
            id: "lesson-3",
            title: "Supreme Court Rulings",
            audioUrl: "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3",
            timeMinutes: 3,
            passage: "In a unanimous decision today, the supreme court overturned the lower court's ruling regarding intellectual property rights in the digital age. The justices argued that the original interpretation of the statute failed to account for modern technological advancements and the speed at which information is disseminated across global networks."
          }
        ]
      }
    ]
  },
  {
    id: "course-2",
    title: "Medical Transcription",
    description: "Learn to transcribe medical reports and patient histories accurately.",
    price: 1999,
    levels: [
      {
        id: "level-normal",
        title: "Normal (60-80 WPM)",
        lessons: [
          {
            id: "lesson-1",
            title: "Patient History",
            audioUrl: "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3",
            timeMinutes: 1,
            passage: "The patient is a thirty five year old male presenting with acute abdominal pain and mild fever. Symptoms began approximately forty eight hours ago after consuming heavily processed foods at a local restaurant."
          }
        ]
      }
    ]
  },
  {
    id: "course-3",
    title: "Shorthand Basics (Free Demo)",
    description: "An introductory course to typing concepts and system tests.",
    price: 0,
    levels: [
      {
        id: "level-normal",
        title: "Normal (30-50 WPM)",
        lessons: [
          {
            id: "demo-lesson",
            title: "Quick Brown Fox",
            audioUrl: "https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3",
            timeMinutes: 1,
            passage: "The quick brown fox jumps over the lazy dog."
          }
        ]
      }
    ]
  }
];
