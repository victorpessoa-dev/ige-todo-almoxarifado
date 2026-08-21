const REAR_CAMERA_LABEL =
  /back|rear|environment|traseir|world|rück|后置|后摄|posteri/i

export function createCameraConstraints({
  facingMode = 'environment',
  deviceId,
  width = 1280,
  height = 720
} = {}) {
  const camera = {
    width: { ideal: width, max: width },
    height: { ideal: height, max: height },
    frameRate: { ideal: 24, max: 30 }
  }

  if (deviceId) {
    camera.deviceId = { exact: deviceId }
  } else {
    camera.facingMode = { exact: facingMode }
  }

  return { audio: false, video: camera }
}

export async function findRearCameraDevice() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return null
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.find(
    (device) => device.kind === 'videoinput' && REAR_CAMERA_LABEL.test(device.label || '')
  ) || null
}

export async function getCameraStream({
  facingMode = 'environment',
  width = 1280,
  height = 720
} = {}) {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('MEDIA_DEVICES_UNAVAILABLE')
  }

  try {
    return await navigator.mediaDevices.getUserMedia(
      createCameraConstraints({ facingMode, width, height })
    )
  } catch (error) {
    if (facingMode !== 'environment') throw error

    const rearCamera = await findRearCameraDevice()
    if (!rearCamera?.deviceId) throw error

    return navigator.mediaDevices.getUserMedia(
      createCameraConstraints({ deviceId: rearCamera.deviceId, width, height })
    )
  }
}