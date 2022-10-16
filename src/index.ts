import dotenv from "dotenv";
import vrchat, { UserStatus } from "vrchat";
import websocket from "websocket";
dotenv.config();

const configuration = new vrchat.Configuration({
  username: process.env.VRC_USERNAME,
  password: process.env.VRC_PASSWORD,
});

const authApi = new vrchat.AuthenticationApi(configuration);
const notificationApi = new vrchat.NotificationsApi(configuration);
const inviteApi = new vrchat.InviteApi(configuration);
const userApi = new vrchat.UsersApi(configuration);

const instanceId = process.env.instanceId;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function main() {
  authApi.getCurrentUser().then((resp) => {
    const currentUser = resp.data;
    console.log("Logged in as " + currentUser.displayName);
    console.log(currentUser);

    userApi.updateUser(currentUser.id, {
      status: UserStatus.JoinMe,
    });

    authApi.verifyAuthToken().then((resp) => {
      const websocketClient = new websocket.client();

      websocketClient.on("connect", function (connection: any) {
        console.log("Connected to websocket");

        connection.on("message", function (originalMessage: any) {
          const message = JSON.parse(originalMessage.utf8Data);

          if (message.type === "notification") {
            const notification = JSON.parse(message.content);
            console.log(notification);

            if (notification.type === "friendRequest") {
              notificationApi.acceptFriendRequest(notification.id);
              console.log("accepted fq");
              sleep(1000).then(() => {
                inviteApi
                  .inviteUser(notification.senderUserId, {
                    instanceId: instanceId ?? "",
                  })
                  .then((resp) => {
                    console.log(resp.data);
                  });
                console.log("invite sent");
              });
            } else if (notification.type === "requestInvite") {
              inviteApi.inviteUser(notification.senderUserId, {
                instanceId: instanceId ?? "",
              });
              console.log("invited user");
            }
          }
        });
      });

      websocketClient.connect(
        "wss://pipeline.vrchat.cloud/?authToken=" + resp.data.token,
        "echo-protocol",
        // @ts-ignore
        null,
        {
          "User-Agent": "vrchat-invite-bot-mmattbtw",
        }
      );
    });
  });
}
main();
