function pickNotificationText(remoteMessage = {}) {
  const title =
    remoteMessage?.notification?.title ||
    remoteMessage?.data?.title ||
    remoteMessage?.data?.heading ||
    'School App';
  const body =
    remoteMessage?.notification?.body ||
    remoteMessage?.data?.body ||
    remoteMessage?.data?.message ||
    'New notification received';
  return { title: String(title), body: String(body) };
}

export async function displayRemoteNotification(remoteMessage) {
  return pickNotificationText(remoteMessage);
}
