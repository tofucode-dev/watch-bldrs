# WatchBldrs — MVP

## Main Problem

People building custom watches mainly share their projects on forums and social media. Information about the parts they used, their inspiration, and problems encountered during the build is scattered, inconsistent, and difficult to find later.

WatchBldrs provides a dedicated place where watch-modification enthusiasts can present their builds in a structured format and discover projects created by other community members.

## Minimum Set of Features

### 1. User and Access (`auth`)

- User registration.
- User login and logout.
- Access to a personal account area.
- Users can edit and delete only their own builds.
- Draft builds are visible only to their authors.
- A private list of the user's favourite builds.

### 2. Build Management (`builds`)

- Creating, viewing, editing, and deleting watch builds.
- Uploading one Main Photo, used as the build thumbnail, and optional Gallery Photos.
- Setting a build's status to `draft` or `published`.
- Adding the following build information:
  - name,
  - description and story behind the build,
  - movement,
  - watch style,
  - case size,
  - dial colour,
  - strap or bracelet type,
  - hands style.
- Adding a Parts List containing:
  - part category,
  - part name,
  - optional product link,
  - optional manually entered purchase price and currency.
- Publishing a build so that it becomes publicly available.

### 3. Home Page (`home`)

- A hero section introducing the WatchBldrs community.
- Navigation to the Home Page, Builds Listing Page, and Account Page.
- Browsing builds through the main Watch Style categories.
- A **Build of the Week** section.
- A **Recent Builds** section.
- A **Popular Builds** section based on the Best ranking.
- Quick links for exploring builds by Movement, Strap Type, or Dial Colour.

### 4. Builds Listing Page — LP (`build-list`)

- Browsing all Published Builds.
- Searching builds by name and Build Story.
- Filtering builds by:
  - movement,
  - watch style,
  - case size,
  - dial colour,
  - strap or bracelet type.
- Combining multiple filters. A build must satisfy all active filters.
- Removing individual filters or clearing all active filters.
- Sorting builds using the following options:
  - **Recent** — most recently published builds,
  - **Best** — builds with the highest total number of likes,
  - **Hot** — builds that received the most likes during the last seven days.
- Loading results in limited pages or batches.
- Displaying an Empty State when no builds match the current query.

### 5. Build Details Page — DP (`build-details`)

- Displaying the build's Main Photo and Gallery Photos.
- Displaying its name, author, Build Story, and publication date.
- Displaying its watch attributes.
- Displaying its Parts List, optional Product Links, and manually entered Part Prices.
- Liking and unliking the build.
- Adding and removing the build from Favourites.
- Displaying the total number of likes.
- Providing edit and delete actions when the current user is the Build Author.

### 6. Discovery and Ranking (`ranking`)

- Ranking Published Builds by publication date for the **Recent** view.
- Ranking Published Builds by total Like Count for the **Best** view.
- Ranking Published Builds by likes received during the last seven days for the **Hot** view.
- Selecting **Build of the Week** using the same seven-day engagement window.
- Resolving ranking ties by displaying the more recently published build first.
- Falling back to the most recently published build when no build has received a like during the last seven days.

## Business Rules

1. Visitors can browse Published Builds but must log in to create, like, or save a build.
2. Only a Build Author can edit, publish, unpublish, or delete their build.
3. Draft Builds are private and must not appear on public pages, in search results, categories, or rankings.
4. Each authenticated user can like a particular build no more than once.
5. Each authenticated user can add a particular build to Favourites no more than once.
6. Removing a like decreases the build's Like Count and may change its ranking.
7. Favourites are private and do not affect rankings.
8. Only likes affect Best, Hot, Popular Builds, and Build of the Week.
9. Search is case-insensitive and checks the build's name and Build Story.
10. Multiple active filters are combined using AND logic.
11. Part Prices are supplied manually by Build Authors. They are not retrieved or updated automatically.
12. The application does not calculate the total build cost in the MVP.

## Domain Dictionary

- [Domain Dictionary](./DOMAIN_DICTIONARY.md)

## Out of Scope for the MVP

- Comments under Builds.
- Similar-Build recommendations.
- A visual watch configurator.
- Automatic Part compatibility checks.
- Integration with AliExpress or other online stores.
- Automatic retrieval of current product prices.
- Automatic calculation of the total Build cost.
- Social profiles, following users, and private messages.
- Forums, articles, events, and a marketplace.
- Notifications.
- An administration panel and manual Featured Builds.
- A native mobile application — the MVP will be a responsive web application.

## Success Criteria

- A user can create an account, log in, and log out.
- An Authenticated User can create, edit, and delete their own Build.
- A user cannot edit or delete a Build belonging to another user.
- A Draft Build is visible only to its Build Author.
- A Published Build appears on the Builds Listing Page and has its own Build Details Page.
- A user can find a Build using Search or Filters.
- A user can like a Build and remove their Like.
- A user can save a Build to Favourites and find it later on their Favourites List.
- Recent, Best, Hot, Popular Builds, and Build of the Week return Builds according to the defined Business Rules.
- The application includes at least one automated test addressing a risk identified in `test-plan.md`, such as verifying that a user cannot edit another user's Build.
- The main application flow works on both desktop and mobile screen sizes.
