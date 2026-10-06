import { PartKindChangeScreen } from '../../src/components/PartKindChangeScreen';
import {
  createFrontSuspensionChange,
  deleteFrontSuspensionChange,
  FRONT_SUSPENSION_PART_KINDS,
  FRONT_SUSPENSION_PART_LABELS,
  getFrontSuspensionChangePhotoUris,
  listFrontSuspensionChanges,
} from '../../src/db/frontSuspensionChanges';
import {
  deleteFrontSuspensionPhoto,
  persistFrontSuspensionPhoto,
} from '../../src/db/frontSuspensionPhotos';

export default function SuspensaoDianteiraScreen() {
  return (
    <PartKindChangeScreen
      partKinds={FRONT_SUSPENSION_PART_KINDS}
      partLabels={FRONT_SUSPENSION_PART_LABELS}
      listChanges={listFrontSuspensionChanges}
      createChange={createFrontSuspensionChange}
      deleteChange={deleteFrontSuspensionChange}
      getPhotoUris={getFrontSuspensionChangePhotoUris}
      persistPhoto={persistFrontSuspensionPhoto}
      deletePhoto={deleteFrontSuspensionPhoto}
    />
  );
}
