## Domain Dictionary

### Users and Access

| Term | Definition |
| --- | --- |
| **Visitor** | A person who is not logged in. A Visitor can browse Published Builds but cannot create, like, or save them. |
| **Authenticated User** | A registered user who is currently logged in. |
| **Build Author** | The Authenticated User who created a particular Build. Only the Build Author can modify or delete it. |
| **Account Page** | A private area containing the user's own Published Builds, Draft Builds, and Favourites. |
| **Ownership** | The relationship between a Build and its Build Author. It determines who may modify or delete the Build. |

The term **Build Author** is preferred over **Builder** in technical documentation to avoid confusion with the 10xBuilder certification badge.

### Builds and Watch Attributes

| Term | Definition |
| --- | --- |
| **Build** | The central resource of the application. It represents a custom watch assembled or modified by a user. In product documentation, Build means a watch build, not a software build. |
| **Draft Build** | A Build with the `draft` status. It is visible only to its Build Author. |
| **Published Build** | A Build with the `published` status. It is publicly available and can appear in search results and rankings. |
| **Build Status** | The visibility state of a Build. The MVP supports `draft` and `published`. |
| **Build Story** | The author-written description covering the inspiration, assembly process, encountered problems, and practical advice related to the Build. |
| **Main Photo** | The primary image representing a Build. It is used as the thumbnail on Build Cards and as the leading image on the Build Details Page. |
| **Gallery Photo** | An optional additional image displayed only on the Build Details Page. |
| **Watch Style** | The primary visual or functional category of a Build, such as `Diver`, `Field`, `Dress`, `GMT`, `Pilot`, or `Integrated`. |
| **Movement** | The movement model used in the watch, for example `NH35`, `NH36`, `NH34`, or `Miyota 8215`. |
| **Case Size** | The diameter of the watch case expressed in millimetres. |
| **Dial Colour** | The primary colour of the watch dial, selected from a predefined list. |
| **Strap Type** | The type of strap or bracelet used in the Build, such as `Leather`, `NATO`, `Rubber`, or `Steel Bracelet`. |
| **Hands Style** | A short classification or name describing the watch hands, such as `Mercedes`, `Sword`, `Dauphine`, or `Baton`. |
| **Part** | A component used in a Build, such as a movement, case, dial, hands, bezel, crystal, strap, or bracelet. |
| **Parts List** | A structured list of Parts used in a Build. |
| **Product Link** | An optional external URL pointing to the page where a Part was purchased or can be viewed. |
| **Part Price** | An optional purchase price manually entered by the Build Author. It is historical user-provided information, not a live market price. |

### Community Interactions

| Term | Definition |
| --- | --- |
| **Like** | A public expression of appreciation for a Build. A user can like a Build once and can later remove that Like. Likes affect rankings. |
| **Like Count** | The total number of active Likes received by a Build. |
| **Favourite** | A private bookmark that allows a user to save a Build for later. Favourites do not affect rankings. |
| **Favourites List** | The private collection of Builds saved by an Authenticated User. |
| **Engagement** | Activity used to determine popularity. In the MVP, Engagement means Likes only. |
| **Comment** | A text response posted under a Build. Comments are not included in the MVP. |

### Discovery and Ranking

| Term | Definition |
| --- | --- |
| **Recent** | Published Builds ordered by `published_at` from newest to oldest. |
| **Best** | Published Builds ordered by total Like Count from highest to lowest. This represents all-time popularity. |
| **Hot** | Published Builds ordered by the number of Likes created during the previous seven days. This represents current community interest. |
| **Build of the Week** | The Published Build that received the most Likes during the previous seven days. If no Build received a Like, the most recently published Build is used. |
| **Popular Builds** | A Home Page section containing a limited selection of Builds taken from the Best ranking. |
| **Ranking Period** | The rolling seven-day period used by Hot and Build of the Week. |
| **Ranking Tie-breaker** | When Builds have the same ranking value, the Build with the more recent `published_at` value appears first. |
| **Category** | A predefined grouping based on Watch Style, used for quick navigation. |
| **Featured Build** | A Build manually selected by an administrator or editor. Manual featuring is outside the MVP, so this term is not used in MVP functionality. |

### Search and Navigation

| Term | Definition |
| --- | --- |
| **Search** | Case-insensitive text matching against the Build name and Build Story. |
| **Filter** | A condition limiting results to Published Builds with a selected attribute. |
| **Active Filter** | A Filter currently applied to the Builds Listing Page. |
| **Combined Filters** | Multiple Active Filters applied simultaneously using AND logic. |
| **Sort Option** | A rule controlling result order. The MVP supports Recent, Best, and Hot. |
| **Pagination** | Loading Builds in limited pages or batches instead of retrieving every result at once. |
| **Empty State** | A message displayed when no Published Builds match the current Search and Filters. |
| **Build Card** | A reusable preview containing a Build's Main Photo, name, author, selected attributes, and Like Count. |

### Application Pages

| Term | Definition |
| --- | --- |
| **Home Page — HP** | The community-oriented landing page containing the hero, Categories, Build of the Week, Recent Builds, and Popular Builds. |
| **Builds Listing Page — LP** | The discovery page used to search, filter, sort, and browse Published Builds. |
| **Build Details Page — DP** | The public page presenting one Build's photos, Build Story, attributes, Parts List, Likes, and Favourite action. |
| **Build Form** | The authenticated page used to create or edit a Build. |
| **Account Page** | The authenticated page containing the user's own Builds and Favourites. |
