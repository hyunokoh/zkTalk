"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeStack;
var react_1 = require("react");
var native_stack_1 = require("@react-navigation/native-stack");
var CommunityAuditLogScreen_1 = require("../screens/CommunityAuditLogScreen");
var CommunityEventsScreen_1 = require("../screens/CommunityEventsScreen");
var CommunityMembersScreen_1 = require("../screens/CommunityMembersScreen");
var CommunityOnboardingScreen_1 = require("../screens/CommunityOnboardingScreen");
var CommunityReportsScreen_1 = require("../screens/CommunityReportsScreen");
var EditCommunityEventScreen_1 = require("../screens/EditCommunityEventScreen");
var EventAttendeesScreen_1 = require("../screens/EventAttendeesScreen");
var EventDetailsScreen_1 = require("../screens/EventDetailsScreen");
var EditCommunityScreen_1 = require("../screens/EditCommunityScreen");
var EditChannelScreen_1 = require("../screens/EditChannelScreen");
var CreatePollScreen_1 = require("../screens/CreatePollScreen");
var ManageCategoriesScreen_1 = require("../screens/ManageCategoriesScreen");
var ManageChannelsScreen_1 = require("../screens/ManageChannelsScreen");
var HomeScreen_1 = require("../screens/HomeScreen");
var ChannelScreen_1 = require("../screens/ChannelScreen");
var ChannelPollsScreen_1 = require("../screens/ChannelPollsScreen");
var ChannelPinsScreen_1 = require("../screens/ChannelPinsScreen");
var ChannelSearchScreen_1 = require("../screens/ChannelSearchScreen");
var ForumChannelScreen_1 = require("../screens/ForumChannelScreen");
var CreateForumPostScreen_1 = require("../screens/CreateForumPostScreen");
var ThreadScreen_1 = require("../screens/ThreadScreen");
var JoinInviteScreen_1 = require("../screens/JoinInviteScreen");
var VoiceCallScreen_1 = require("../screens/VoiceCallScreen");
var CreateCommunityScreen_1 = require("../screens/CreateCommunityScreen");
var CreateChannelScreen_1 = require("../screens/CreateChannelScreen");
var i18n_1 = require("../lib/i18n");
var theme_1 = require("../theme");
var Stack = (0, native_stack_1.createNativeStackNavigator)();
function HomeStack() {
    return (<Stack.Navigator screenOptions={{
            headerStyle: { backgroundColor: theme_1.colors.backgroundDark },
            headerTintColor: theme_1.colors.white,
            headerTitleStyle: { fontWeight: '600', fontSize: 18 },
            contentStyle: { backgroundColor: theme_1.colors.background },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
        }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen_1.default} options={{ title: (0, i18n_1.t)('app.name'), headerShown: false }}/>
      <Stack.Screen name="CommunityMembers" component={CommunityMembersScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.communityName
                    ? (0, i18n_1.t)('community.membersTitle', { name: route.params.communityName })
                    : (0, i18n_1.t)('community.membersDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="CommunityEvents" component={CommunityEventsScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.communityName
                    ? (0, i18n_1.t)('community.eventsTitle', { name: route.params.communityName })
                    : (0, i18n_1.t)('community.eventsDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="EditCommunityEvent" component={EditCommunityEventScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.eventId ? (0, i18n_1.t)('event.edit') : (0, i18n_1.t)('event.create'),
            });
        }}/>
      <Stack.Screen name="EventAttendees" component={EventAttendeesScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.eventTitle
                    ? (0, i18n_1.t)('event.attendeesTitle', { title: route.params.eventTitle })
                    : (0, i18n_1.t)('event.attendeesDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="EventDetails" component={EventDetailsScreen_1.default} options={function (_a) {
            var _b;
            var route = _a.route;
            return ({
                title: (_b = route.params.eventTitle) !== null && _b !== void 0 ? _b : (0, i18n_1.t)('event.detailsDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="CommunityReports" component={CommunityReportsScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.communityName
                    ? (0, i18n_1.t)('community.reportsTitle', { name: route.params.communityName })
                    : (0, i18n_1.t)('community.reportsDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="CommunityAuditLog" component={CommunityAuditLogScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.communityName
                    ? (0, i18n_1.t)('community.auditLogTitle', { name: route.params.communityName })
                    : (0, i18n_1.t)('community.auditLogDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="CommunityOnboarding" component={CommunityOnboardingScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.communityName
                    ? (0, i18n_1.t)('community.onboardingTitle', { name: route.params.communityName })
                    : (0, i18n_1.t)('community.onboardingDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="EditCommunity" component={EditCommunityScreen_1.default} options={{ title: (0, i18n_1.t)('community.edit') }}/>
      <Stack.Screen name="EditChannel" component={EditChannelScreen_1.default} options={{ title: (0, i18n_1.t)('channel.edit') }}/>
      <Stack.Screen name="ChannelPolls" component={ChannelPollsScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.channelName
                    ? (0, i18n_1.t)('poll.titleWithChannel', { name: route.params.channelName })
                    : (0, i18n_1.t)('poll.title'),
            });
        }}/>
      <Stack.Screen name="CreatePoll" component={CreatePollScreen_1.default} options={{ title: (0, i18n_1.t)('poll.create') }}/>
      <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.communityName
                    ? (0, i18n_1.t)('channel.categoriesTitle', { name: route.params.communityName })
                    : (0, i18n_1.t)('channel.categoriesDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="ManageChannels" component={ManageChannelsScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.communityName
                    ? (0, i18n_1.t)('channel.orderTitle', { name: route.params.communityName })
                    : (0, i18n_1.t)('channel.orderDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="ChannelScreen" component={ChannelScreen_1.default} options={function (_a) {
        var _b;
        var route = _a.route;
        return ({ title: "# ".concat((_b = route.params.channelName) !== null && _b !== void 0 ? _b : (0, i18n_1.t)('nav.channel')) });
    }}/>
      <Stack.Screen name="ChannelPins" component={ChannelPinsScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.channelName
                    ? (0, i18n_1.t)('channel.pinsTitle', { name: route.params.channelName })
                    : (0, i18n_1.t)('channel.pinsDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="ChannelSearch" component={ChannelSearchScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.channelName
                    ? (0, i18n_1.t)('channel.searchTitle', { name: route.params.channelName })
                    : (0, i18n_1.t)('channel.searchDefaultTitle'),
            });
        }}/>
      <Stack.Screen name="ThreadScreen" component={ThreadScreen_1.default} options={{ title: (0, i18n_1.t)('message.thread') }}/>
      <Stack.Screen name="ForumChannelScreen" component={ForumChannelScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.channelName ? "# ".concat(route.params.channelName) : (0, i18n_1.t)('channel.typeForum'),
            });
        }}/>
      <Stack.Screen name="CreateForumPost" component={CreateForumPostScreen_1.default} options={{ title: (0, i18n_1.t)('forum.createPost') }}/>
      <Stack.Screen name="JoinInvite" component={JoinInviteScreen_1.default} options={{ title: (0, i18n_1.t)('community.joinInviteTitle') }}/>
      <Stack.Screen name="VoiceCallScreen" component={VoiceCallScreen_1.default} options={function (_a) {
            var route = _a.route;
            return ({
                title: route.params.channelName,
                headerStyle: { backgroundColor: theme_1.colors.black },
                contentStyle: { backgroundColor: theme_1.colors.black },
            });
        }}/>
      <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen_1.default} options={{ title: (0, i18n_1.t)('community.create') }}/>
      <Stack.Screen name="CreateChannel" component={CreateChannelScreen_1.default} options={{ title: (0, i18n_1.t)('channel.create') }}/>
    </Stack.Navigator>);
}
