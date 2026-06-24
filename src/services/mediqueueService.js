export { listClinics as getClinics, getClinic } from './clinicService'
export {
  getDoctor,
  getOwnDoctor,
  listDoctors as getDoctors,
  listDoctorsWithQueueSummary,
} from './doctorService'
export {
  addWalkInPatient,
  callNextPatient,
  completeCurrentPatient,
  getQueueForDoctor,
  joinQueue,
  removeQueueEntry,
  subscribeToDoctorQueue,
} from './queueService'
export { queuePatientName, queueToken } from '../lib/queue'
