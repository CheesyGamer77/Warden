# Contributing

We welcome all contributions to the codebase. Please be sure to read the following guidelines before submitting any contributions.

We use ESLint to enforce a consistent code style, as well as conventional commits in order to enforce a consistent git message style. We encourage for you to set either (or both) of these up in your workspace. PRs that violate either of these will be rejected.

## Setup

To setup your workspace to contribute to the project, please do the following:

1) [Fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo) and [Clone](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository) the repository. Make sure you are on the `main` branch.
2) Create a `config.json` and `.env` file, following the example files provided.
3) Run `npm install` to install the neccesary dependencies.
4) Create a new branch for your change.
5) Make your changes. Be sure to use [conventional commit messages](https://conventionalcommits.org/).
6) Test your changes locally.
7) [Open a Pull Request](https:/./docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request) for your changes. Be sure that you base your changes on the `main` branch.

## Vision

Warden is a content moderation bot. As such, contributions should avoid adding features that don't directly make content moderation easier.

As an example: a contribution that adds a `/meme` command to search for memes to post is not in line with the project's vision, and will likely be rejected. However, a feature that adds a new content filter type is in line with this project's vision, and will likely be welcomed & merged.

We strive to make Warden as configurable as possible, with nothing enabled by default. This allows the end user to have full control over what parts of Warden are enabled/disabled according to their needs.

## Localization

We localize all publicly facing text messages using [i18next](https://i18next.com) in order to make Warden more accessible internationally.

- **Non-ephemeral** messages sent to users should be localized using the guild's preferred locale (`interaction.guild.preferredLocale`)
- **Ephemeral** messages sent in reply to a user should be localized using the user's preferred locale (`interaction.locale`)

## Data Processing

We use [prisma](https://prisma.io) as our database Object Relational Mapping (ORM). As such, contributions should never rely on raw SQL queries and should instead utilize the Prisma Client API.

Resource caching should be utilized where deemed reasonably possible in order to minimize the number of database read operations. Database write operations should utilize bulk inserts where deemed reasonably possible.

Contributions should avoid storing/processing personally identifiable information about any users. When possible, limit the data stored about a user to only their Discord User ID.

## Content Filters

All aspects involving content filter strategies should be configurable to the end user using the `/config` command, including:

- Whether the filter is enabled or not. This should **always** be disabled by default.
- Which channel the filter should log its output to.
