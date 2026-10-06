import { PartKindChangeScreen } from '../../src/components/PartKindChangeScreen';
import {
  createRearSuspensionChange,
  deleteRearSuspensionChange,
  getRearSuspensionChangePhotoUris,
  listRearSuspensionChanges,
  REAR_SUSPENSION_PART_KINDS,
  REAR_SUSPENSION_PART_LABELS,
} from '../../src/db/rearSuspensionChanges';
import {
  deleteRearSuspensionPhoto,
  persistRearSuspensionPhoto,
} from '../../src/db/rearSuspensionPhotos';

export default function SuspensaoTraseiraScreen() {
  return (
    <PartKindChangeScreen
      partKinds={REAR_SUSPENSION_PART_KINDS}
      partLabels={REAR_SUSPENSION_PART_LABELS}
      listChanges={listRearSuspensionChanges}
      createChange={createRearSuspensionChange}
      deleteChange={deleteRearSuspensionChange}
      getPhotoUris={getRearSuspensionChangePhotoUris}
      persistPhoto={persistRearSuspensionPhoto}
      deletePhoto={deleteRearSuspensionPhoto}
    />
  );
}
