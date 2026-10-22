// Doctoral research seminars: the formation sequence's 8xx courses (phil-801)
// and every Seminar Track course (sem-801, sem-802, ...). They get the
// doctoral grading and evaluation appendices, the doctoral viva, and an 80%
// quiz pass mark.
export const isDoctoralCourse = (courseId: string | null | undefined): boolean =>
  /^(phil|sem)-8\d\d$/.test(courseId ?? '');
