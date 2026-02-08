const User = require('./User');
const Project = require('./Project');
const Search = require('./Search');
const Work = require('./Work');
const SearchResult = require('./SearchResult');
const ProjectArticle = require('./ProjectArticle');
const ScreeningEvent = require('./ScreeningEvent');
const Spreadsheet = require('./Spreadsheet');
const Dataset = require('./Dataset');
const UserSearchHistory = require('./UserSearchHistory');

// ===== Associations =====

// User -> Projects
User.hasMany(Project, { foreignKey: 'user_id', as: 'projects' });
Project.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Project -> Searches
Project.hasMany(Search, { foreignKey: 'project_id', as: 'searches', onDelete: 'CASCADE' });
Search.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// User -> Searches
User.hasMany(Search, { foreignKey: 'user_id', as: 'searches' });
Search.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Search -> SearchResults
Search.hasMany(SearchResult, { foreignKey: 'search_id', as: 'results', onDelete: 'CASCADE' });
SearchResult.belongsTo(Search, { foreignKey: 'search_id', as: 'search' });

// Work -> SearchResults
Work.hasMany(SearchResult, { foreignKey: 'work_id', as: 'searchResults' });
SearchResult.belongsTo(Work, { foreignKey: 'work_id', as: 'work' });

// Project -> ProjectArticles
Project.hasMany(ProjectArticle, { foreignKey: 'project_id', as: 'articles', onDelete: 'CASCADE' });
ProjectArticle.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Work -> ProjectArticles
Work.hasMany(ProjectArticle, { foreignKey: 'work_id', as: 'projectArticles' });
ProjectArticle.belongsTo(Work, { foreignKey: 'work_id', as: 'work' });

// Search -> ProjectArticles (optional link)
Search.hasMany(ProjectArticle, { foreignKey: 'search_id', as: 'articles' });
ProjectArticle.belongsTo(Search, { foreignKey: 'search_id', as: 'search' });

// Project -> ScreeningEvents
Project.hasMany(ScreeningEvent, { foreignKey: 'project_id', as: 'screeningEvents', onDelete: 'CASCADE' });
ScreeningEvent.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// ProjectArticle -> ScreeningEvents
ProjectArticle.hasMany(ScreeningEvent, { foreignKey: 'article_id', as: 'screeningEvents', onDelete: 'CASCADE' });
ScreeningEvent.belongsTo(ProjectArticle, { foreignKey: 'article_id', as: 'article' });

// User -> ScreeningEvents
User.hasMany(ScreeningEvent, { foreignKey: 'user_id', as: 'screeningEvents' });
ScreeningEvent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> Spreadsheets
User.hasMany(Spreadsheet, { foreignKey: 'user_id', as: 'spreadsheets' });
Spreadsheet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> Datasets
User.hasMany(Dataset, { foreignKey: 'user_id', as: 'datasets' });
Dataset.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> UserSearchHistory
User.hasMany(UserSearchHistory, { foreignKey: 'user_id', as: 'searchHistory' });
UserSearchHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  User,
  Project,
  Search,
  Work,
  SearchResult,
  ProjectArticle,
  ScreeningEvent,
  Spreadsheet,
  Dataset,
  UserSearchHistory
};
