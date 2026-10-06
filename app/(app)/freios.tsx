import { PartKindChangeScreen } from '../../src/components/PartKindChangeScreen';
import {
  BRAKE_PART_KINDS,
  BRAKE_PART_LABELS,
  createBrakeChange,
  deleteBrakeChange,
  getBrakeChangePhotoUris,
  listBrakeChanges,
} from '../../src/db/brakeChanges';
import { deleteBrakePhoto, persistBrakePhoto } from '../../src/db/brakePhotos';

export default function FreiosScreen() {
  return (
    <PartKindChangeScreen
      partKinds={BRAKE_PART_KINDS}
      partLabels={BRAKE_PART_LABELS}
      listChanges={listBrakeChanges}
      createChange={createBrakeChange}
      deleteChange={deleteBrakeChange}
      getPhotoUris={getBrakeChangePhotoUris}
      persistPhoto={persistBrakePhoto}
      deletePhoto={deleteBrakePhoto}
    />
  );
}
