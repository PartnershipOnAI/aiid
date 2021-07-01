import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { navigate } from 'gatsby';
import { StringParam, QueryParams, useQueryParams } from 'use-query-params';
import algoliasearch from 'algoliasearch/lite';
import { debounce } from 'debounce';
import {
  InstantSearch,
  Highlight,
  connectHits,
  connectRefinementList,
  Pagination,
  Stats,
  connectSearchBox,
  connectRange,
} from 'react-instantsearch-dom';
import styled from 'styled-components';
import config from '../../config';
import md5 from 'md5';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faNewspaper,
  faIdCard,
  faUserShield,
  faFlag,
  faHashtag,
  faTimesCircle,
  faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons';
import { useModal, CustomModal } from '../../src/components/useModal';
import LayoutHideSidebar from 'components/LayoutHideSidebar';
import { Form, Button } from 'react-bootstrap';
import Helmet from 'react-helmet';

import '../../static/discover/src/app.css';
import '../../static/discover/src/index.css';
import { add, format, formatISO, isAfter, isBefore } from 'date-fns';

export const searchClient = algoliasearch('8TNY3YFAO8', '55efba4929953a53eb357824297afb4c');

const REFINEMENT_LISTS = [
  {
    attribute: 'source_domain',
    inputText: "Filter Domains ('bbc.com')",
    label: 'Source',
    faIcon: faNewspaper,
    faClasses: 'far fa-newspaper',
  },
  {
    attribute: 'authors',
    inputText: "Filter Authors ('Helen...')",
    label: 'Authors',
    faIcon: faIdCard,
    faClasses: 'far fa-id-card',
  },
  {
    attribute: 'submitters',
    inputText: "Filter Submitters ('Helen...')",
    label: 'Submitters',
    faIcon: faUserShield,
    faClasses: 'fas fa-user-shield',
  },
  {
    attribute: 'incident_id',
    inputText: "Filter incident number ('42')",
    label: 'Incident ID',
    faIcon: faHashtag,
    faClasses: 'fas fa-hashtag',
  },
  {
    attribute: 'epoch_incident_date',
    inputText: 'none',
    label: 'Incident Date',
    faIcon: faCalendarAlt,
    faClasses: 'far fa-calendar-alt',
  },
  {
    attribute: 'epoch_date_published',
    inputText: 'none',
    label: 'Published Date',
    faIcon: faCalendarAlt,
    faClasses: 'far fa-calendar-alt',
  },
  {
    attribute: 'flag',
    inputText: 'none',
    label: 'Flagged',
    faIcon: faFlag,
    faClasses: 'far fa-flag',
  },
];

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;

  @media (max-width: 767px) {
    padding: 0;
  }
`;

const SidesContainer = styled.div`
  display: flex;
  flex-direction: row;
  max-width: 100%;
  padding-top: 2rem;

  @media (max-width: 1440px) {
    padding-top: 1em;
  }

  @media (max-width: 570px) {
    flex-direction: column-reverse;
  }
`;

const HitsContainer = styled.div`
  display: grid;
  max-width: 100%;
  grid-gap: 13px;
  grid-template-columns: 1fr 1fr 1fr;

  ${({ showDetails }) =>
    showDetails === true &&
    `
    grid-template-columns: auto;
  `};

  @media (max-width: 1240px) {
    grid-template-columns: 1fr 1fr;
    ${({ showDetails }) =>
      showDetails === true &&
      `
      grid-template-columns: auto;
    `};
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;

    ${({ showDetails }) =>
      showDetails === true &&
      `
      grid-template-columns: auto;
    `};
  }
`;

const RangeInputContainer = styled.div`
  padding-bottom: 1.5rem;
`;

const StatsContainer = styled.div`
  display: grid;
  max-width: 100%;
  grid-template-columns: 1fr 3fr;
  padding: 1.25rem;
`;

const FacetsSide = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 300px;

  @media (max-width: 1440px) {
    max-width: 300px;
  }

  @media (max-width: 570px) {
    max-width: unset;
  }
`;

const Text = styled.p`
  line-height: 1.3;
`;

const ResultsSide = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  max-width: 85%;
  padding-right: 2rem;

  @media (max-width: 1440px) {
    padding-right: 1rem;
  }

  @media (max-width: 570px) {
    width: 100%;
    padding: 0;
  }
`;

const IncidentCardContainer = styled.div`
  border: 1.5px solid #d9deee;
  border-radius: 5px;
  box-shadow: 0 2px 5px 0px #e3e5ec;
  display: flex;
  flex-direction: column;
`;

const RefinementListContainer = styled.div`
  margin-bottom: 1rem;
`;

const StyledPagination = styled(Pagination)`
  padding: 50px 0 50px 0;

  .ais-Pagination {
    color: #3a4570;
  }

  .ais-Pagination-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    justify-content: center;
  }

  .ais-Pagination-item + .ais-Pagination-item {
    margin-left: 0.3rem;
  }

  .ais-Pagination-link {
    color: #0096db;
    -webkit-transition: color 0.2s ease-out;
    transition: color 0.2s ease-out;
    padding: 0.3rem 0.6rem;
    display: block;
    border: 1px solid #c4c8d8;
    border-radius: 5px;
    -webkit-transition: background-color 0.2s ease-out;
    transition: background-color 0.2s ease-out;

    :hover {
      color: #0073a8;
      background-color: #e3e5ec;
    }

    :focus {
      color: #0073a8;
      background-color: #e3e5ec;
    }
  }

  .ais-Pagination-item--disabled .ais-Pagination-link {
    opacity: 0.6;
    cursor: not-allowed;
    color: #a5abc4;

    :hover {
      color: #a5abc4;
      background-color: #fff;
    }

    :focus {
      color: #a5abc4;
      background-color: #fff;
    }
  }

  .ais-Pagination-item--selected .ais-Pagination-link {
    color: #fff;
    background-color: #0096db;
    border-color: #0096db;

    :hover {
      color: #fff;
    }

    :focus {
      color: #fff;
    }
  }
`;

const CardFooter = styled.div`
  display: flex;
  width: 100%;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
`;

const RefinementListHeader = styled.span`
  display: block;
`;

const StyledStats = styled(Stats)`
  position: absolute;
  top: 4px;
  right: 28px;
  z-index: 1;
`;

const StyledButton = styled.button`
  width: 100%;
  background-color: white;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  border-radius: 0rem;
  margin-top: 0rem !important;
  border: 1px solid transparent;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out,
    border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;

  :hover {
    color: #fff;
    background-color: #6bb3ff;
    border-color: #6bb3ff;
    text-decoration: none;
  }

  ${({ active }) =>
    active === true &&
    `
    color: #fff;
    background-color: #007bff;
    border-color: #007bff;
  `};
`;

const CardBody = styled.div`
  padding: 1.25rem 1.25rem 0 1.25rem !important;
`;

const StyledSearchInput = styled.input`
  padding: 0.3rem 0.3rem !important;
  max-width: 100% !important;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  padding: 0.3rem 1.7rem;
  width: 100%;
  position: relative;
  background-color: #fff;
  border: 1px solid #c4c8d8;
  border-radius: 5px;
`;

const FiltersContainer = styled.div`
  width: 100;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  padding-top: 2em;
`;

const Tags = styled(Button)`
  &&& {
    margin-bottom: 0.7em;
    margin-right: 0.5em;
    border-radius: 23px;

    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    p {
      margin-bottom: 0 !important;
      margin-right: 0.4em;
      /* padding-bottom: 1em; */
    }
  }
`;

const SearchResetButton = styled.button`
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  position: absolute;
  z-index: 1;
  width: 20px;
  height: 20px;
  top: 50%;
  right: 0.3rem;
  -webkit-transform: translateY(-50%);
  transform: translateY(-50%);

  padding: 0;
  overflow: visible;
  font: inherit;
  line-height: normal;
  color: inherit;
  background: none;
  border: 0;
  cursor: pointer;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 100%;

  @media (max-width: 767px) {
    .fa-BARS {
      display: none;
    }
  }
`;

export const NoResults = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;

  grid-column-start: 2;
  grid-column-end: 3;

  p {
    text-align: center;
  }

  @media (max-width: 1240px) {
    grid-column-start: 1;
  }
`;

const SearchContainer = styled.div`
  flex-grow: 1;
`;

const SearchForm = styled.form`
  display: block;
  position: relative;
`;

const StyledLabel = styled.p`
  margin: 0.6em 0;
`;

const StyledRefinementList = ({
  items,
  isFromSearch,
  refine,
  searchForItems,
  createURL,
  placeholder,
  listLabel,
  faIcon,
  faClasses,
}) => (
  <RefinementListContainer className="refine">
    <RefinementListHeader className="refine_header">
      <FontAwesomeIcon icon={faIcon} className={faClasses} />
      {` ${listLabel}`}
    </RefinementListHeader>
    {items.length === 0 && <div className="d-flex justify-content-center">No result</div>}
    {items.map((item) => (
      <StyledButton
        key={item.label}
        active={item.isRefined}
        href={createURL(item.value)}
        onClick={(event) => {
          event.preventDefault();
          refine(item.value);
        }}
      >
        {isFromSearch ? <Highlight attribute="label" hit={item} /> : item.label}
        <span className="badge badge-secondary badge-pill">{item.count}</span>
      </StyledButton>
    ))}
    <input
      className="form-control"
      type="search"
      placeholder={placeholder}
      onChange={(event) => searchForItems(event.currentTarget.value)}
    />
  </RefinementListContainer>
);

const getFlagModalContent = () => (
  <div className="modal-body">
    <p>Is there a problem with this content? Examples of &quot;problems`&quot;` include,</p>
    <ul>
      <li>The text contents of the report are not parsed properly</li>
      <li>The authors of the report are not associated with the report</li>
      <li>The report is associated with the wrong incident</li>
      <li>The text contents of the report are not parsed properly</li>
    </ul>
    <p>
      Flagged content will still be displayed within the database, but a database editor will
      periodically review the incident reports that have been flagged. Please note that the content
      contained within incident reports (e.g., the commentary within a news article) does not need
      to be correct or consistent across articles. If an article is wrong, misleading, or
      fraudulent, the best response is to submit additional incident reports that correct the
      record. The incident database is meant to capture the complete state of knowledge and
      discourse for incidents, not as an arbiter of what happened in individual incidents. In future
      versions of the database it will additionally be possible to apply tags to incident reports to
      classNameify their content.
    </p>
    <p>Please do NOT flag content if,</p>
    <ul>
      <li>You disagree with the report</li>
      <li>The linked report has disappeared from the web</li>
      <li>The report should not be considered an `&quot;`incident`&quot;`</li>
    </ul>
    <button
      type="button"
      className="btn btn-danger btn-sm btn-block flag-button"
      data-dismiss="modal"
    >
      Flag Report
    </button>
  </div>
);

const cardNeedsBlockquote = (item) => {
  if (item.text && item.text.matchLevel === 'full') {
    return true;
  }
  return false;
};

const getParagraphs = (itemText) => {
  return (
    <>
      {itemText.split('\n').map((paragraph, index, array) => (
        <p key={index}>
          {array.length - 1 === index ? <>{paragraph + '...'}</> : <>{paragraph}</>}
        </p>
      ))}
    </>
  );
};

export const IncidentStatsCard = ({ incidentId, reportCount, incidentDate }) => {
  const STATS = [
    {
      key: 'incidentId',
      label: 'Incident ID',
    },
    {
      key: 'reportCount',
      label: 'Report Count',
    },
    {
      key: 'incidentDate',
      label: 'Incident Date',
    },
  ];

  if (reportCount === 0) {
    return null;
  }

  const stats = {
    incidentId,
    reportCount,
    incidentDate,
  };

  return (
    <IncidentCardContainer className="card">
      <div className="card-header">
        <h4>Incident Stats</h4>
      </div>
      <StatsContainer className="card-body">
        <div>
          {STATS.map((stat) => (
            <div key={stat.key}>{stat.label}</div>
          ))}
        </div>
        <div>
          {STATS.map((stat) => (
            <div key={stat.key}>{stats[stat.key]}</div>
          ))}
        </div>
      </StatsContainer>
    </IncidentCardContainer>
  );
};

export const IncidentCard = ({
  item,
  authorsModal,
  submittersModal,
  flagReportModal,
  toggleFilterByIncidentId,
  showDetails,
  isCitePage,
}) => (
  <IncidentCardContainer id={item.mongodb_id}>
    <div className="card-header">
      {isCitePage ? <span>{item.title}</span> : <Highlight hit={item} attribute="title" />}
      <p className="subhead">
        {item.source_domain} &middot;{' '}
        {item.date_published ? item.date_published.substring(0, 4) : 'Needs publish date'}
      </p>
    </div>
    <CardBody className="card-body">
      {/* <Highlight hit={item} attribute="description" /> */}
      {item._snippetResult && cardNeedsBlockquote(item._snippetResult) && (
        <blockquote>
          <Highlight
            hit={{
              _highlightResult: {
                ...item._snippetResult,
                text: {
                  ...item._snippetResult.text,
                  value: `...${item._snippetResult.text.value}...`,
                },
              },
            }}
            attribute="text"
          />
        </blockquote>
      )}
      {showDetails ? (
        <div>{getParagraphs(item.text)}</div>
      ) : (
        <div>
          <Text>{item.text.substr(0, 400) + '...'}</Text>
        </div>
      )}
    </CardBody>
    <div className="align-bottom">
      <img className="image-preview" alt={item.title} src={getImageHashPath(item.image_url)} />
      {toggleFilterByIncidentId && (
        <button
          type="button"
          className="btn btn-secondary btn-sm btn-block assignment-button"
          onClick={() => {
            navigate(`/cite/${item.incident_id}#${item.mongodb_id}`);
          }}
        >
          <StyledLabel>Show Details on Incident #{item.incident_id}</StyledLabel>
        </button>
      )}
    </div>
    <CardFooter className="card-footer text-muted">
      <a href={item.url} target="_blank" rel="noreferrer">
        <FontAwesomeIcon icon={faNewspaper} className="far fa-newspaper" title="Read the Source" />
      </a>

      <FontAwesomeIcon
        icon={faIdCard}
        className="pointer far fa-id-card"
        title="Authors"
        onClick={() =>
          authorsModal.openFor({
            title: 'Authors',
            body: function f() {
              return item.authors.join(', ');
            },
          })
        }
      />

      <FontAwesomeIcon
        icon={faUserShield}
        className="pointer fas fa-user-shield"
        title="Submitters"
        onClick={() =>
          submittersModal.openFor({
            title: 'Submitters',
            body: function f() {
              return item.submitters.join(', ');
            },
          })
        }
      />

      <FontAwesomeIcon
        icon={faFlag}
        className="pointer far fa-flag"
        title="Flag Report"
        onClick={() =>
          flagReportModal.openFor({
            title: 'Submitters',
            body: function f() {
              return getFlagModalContent();
            },
          })
        }
      />

      {toggleFilterByIncidentId && (
        <span
          aria-hidden="true"
          className="pointer"
          onClick={() => toggleFilterByIncidentId(item.incident_id + '')}
        >
          <FontAwesomeIcon icon={faHashtag} className="fas fa-hashtag" title="Incident ID" />
          {item.incident_id}
        </span>
      )}
    </CardFooter>
  </IncidentCardContainer>
);

// eslint-disable-next-line react/display-name
const StyledSearchBox = React.memo(({ refine, customRef }) => {
  const [loading, setLoading] = useState(false);

  const debouncedRefine = debounce((text) => {
    refine(text);
  }, 500);

  const debouceRefineCallback = useCallback((value) => debouncedRefine(value), []);

  const handleOnChange = (e) => {
    e.preventDefault();
    setLoading(true);
    debouceRefineCallback(e.target.value);
    setLoading(false);
  };

  return (
    <SearchContainer>
      <SearchForm>
        <StyledSearchInput
          readOnly={loading}
          type="text"
          ref={customRef}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="Search"
          spellCheck="false"
          maxLength="512"
          onKeyPress={(e) => {
            e.key === 'Enter' && e.preventDefault();
          }}
          onChange={handleOnChange}
        />
        <SearchResetButton type="reset" title="Clear the search query." onClick={() => refine('')}>
          <FontAwesomeIcon
            icon={faTimesCircle}
            className="pointer fa fa-times-circle"
            title="reset"
          />
        </SearchResetButton>
        <StyledStats
          translations={{
            stats(nbHits) {
              return (
                <span className="badge badge-secondary badge-pill">{`${
                  nbHits === 0 ? 'No' : nbHits
                } reports found`}</span>
              );
            },
          }}
        />
      </SearchForm>
    </SearchContainer>
  );
});

const CustomSearchBox = React.memo(connectSearchBox(StyledSearchBox));

const RefinementList = connectRefinementList(StyledRefinementList);

const getImageHashPath = (imgUrl) => {
  return `${config.gatsby.siteUrl}/large_media/report_banners/${md5(imgUrl)}`;
};

const removeUndefinedAttributes = (obj) => {
  for (const attr in obj) {
    if (obj[attr] === undefined) {
      delete obj[attr];
    }
  }
  return { ...obj };
};

const removeEmptyAttributes = (obj) => {
  for (const attr in obj) {
    if (obj[attr] === '' || obj[attr].length === 0) {
      delete obj[attr];
    }
  }
  return { ...obj };
};

const convertArrayToString = (obj) => {
  for (const attr in obj) {
    if (obj[attr].length > 0) {
      obj[attr] = obj[attr].join();
    }
  }
  return { ...obj };
};

const validateDate = (date) => {
  const dateStr = date + '';

  if (dateStr.length <= 10) {
    return date * 1000;
  }
  return date;
};

const convertStringToArray = (obj) => {
  const stringKeys = ['source_domain', 'authors', 'submitters', 'incident_id', 'flag'];

  let newObj = {};

  for (const attr in obj) {
    if (stringKeys.includes(attr) && obj[attr] !== undefined) {
      newObj[attr] = obj[attr].split(',');
    }
  }
  return newObj;
};

const convertRangeToQueryString = (rangeObj) => {
  let rangeQueryObj = {};

  for (const attr in rangeObj) {
    if (rangeObj[attr] !== undefined && rangeObj[attr].min) {
      rangeQueryObj[`${attr}_min`] = rangeObj[attr].min;
    }
    if (rangeObj[attr] !== undefined && rangeObj[attr].max) {
      rangeQueryObj[`${attr}_max`] = rangeObj[attr].max;
    }
  }

  return rangeQueryObj;
};

const convertStringToRange = (query) => {
  const rangeKeys = [
    'epoch_incident_date_min',
    'epoch_incident_date_max',
    'epoch_date_published_min',
    'epoch_date_published_max',
  ];

  let resultObj = {};

  for (const attr in query) {
    if (rangeKeys.includes(attr)) {
      if (attr.includes('_min') && !isNaN(parseInt(query[attr]))) {
        resultObj[attr.split('_min')[0]] = {
          ...resultObj[attr.split('_min')[0]],
          min: parseInt(query[attr]),
        };
      }

      if (attr.includes('_max') && !isNaN(parseInt(query[attr]))) {
        resultObj[attr.split('_max')[0]] = {
          ...resultObj[attr.split('_max')[0]],
          max: parseInt(query[attr]),
        };
      }
    }
  }

  return resultObj;
};

const RangeInput = ({ currentRefinement: { min, max }, refine }) => {
  if (!min || !max) {
    return null;
  }

  const [localMin, setLocalMin] = useState(validateDate(min));

  const [localMax, setLocalMax] = useState(validateDate(max));

  const [limitInterval, setLimitInterval] = useState({ min: 0, max: 0 });

  useEffect(() => {
    setLimitInterval({
      min: formatISO(validateDate(min), { representation: 'date' }),
      max: formatISO(validateDate(max), { representation: 'date' }),
    });
  }, []);

  useEffect(() => {
    setLocalMin(validateDate(min));
    setLocalMax(validateDate(max));
  }, [min, max]);

  if (!localMax || !localMin) {
    return null;
  }

  const onChangeMinDate = debounce((newInput) => {
    try {
      if (
        newInput !== '' &&
        newInput.length <= 10 &&
        isAfter(new Date(newInput), new Date(limitInterval.min))
      ) {
        setLocalMin(new Date(newInput || limitInterval.min).getTime());
        refine({
          max: validateDate(localMax) / 1000,
          min: validateDate(new Date(newInput || limitInterval.min).getTime()) / 1000,
        });
      }
    } catch (error) {
      refine({
        max: validateDate(localMax) / 1000,
        min: validateDate(add(validateDate(localMax) / 1000, { seconds: 1 }).getTime()) / 1000,
      });
    }
  }, 1000);

  const onChangeMaxDate = debounce((newInput) => {
    try {
      if (
        newInput !== '' &&
        newInput.length <= 10 &&
        isBefore(new Date(newInput), new Date(limitInterval.max))
      ) {
        setLocalMax(new Date(newInput || limitInterval.max).getTime());
        refine({
          max: validateDate(new Date(newInput || limitInterval.max).getTime()) / 1000,
          min: validateDate(localMin) / 1000,
        });
      }
    } catch (error) {
      refine({
        min: validateDate(localMin) / 1000,
        max: validateDate(add(validateDate(localMin) / 1000, { seconds: 1 }).getTime()) / 1000,
      });
    }
  }, 1000);

  return (
    <Form>
      <Form.Label>From Date:</Form.Label>
      <Form.Control
        required={true}
        type="date"
        defaultValue={formatISO(localMin, { representation: 'date' })}
        onChange={(event) => onChangeMinDate(event.currentTarget.value)}
        min={limitInterval.min}
        onKeyDown={(e) => e.preventDefault()}
      />

      <Form.Label>To Date:</Form.Label>
      <Form.Control
        required={true}
        type="date"
        defaultValue={formatISO(localMax, { representation: 'date' })}
        onChange={(event) => onChangeMaxDate(event.currentTarget.value)}
        max={limitInterval.max}
        onKeyDown={(e) => e.preventDefault()}
      />
    </Form>
  );
};

const CustomRangeInput = connectRange(RangeInput);

const RenderCards = ({
  hits,
  toggleFilterByIncidentId,
  showDetails,
  authorsModal,
  submittersModal,
  flagReportModal,
}) => {
  if (hits.length === 0) {
    return (
      <NoResults>
        <p>Your search returned no results.</p>
        <p>Please clear your search in the search box above or the filters.</p>
      </NoResults>
    );
  }

  return (
    <>
      {hits.map((hit) => (
        <IncidentCard
          key={hit.objectID}
          item={hit}
          authorsModal={authorsModal}
          submittersModal={submittersModal}
          flagReportModal={flagReportModal}
          toggleFilterByIncidentId={toggleFilterByIncidentId}
          showDetails={showDetails}
        />
      ))}
    </>
  );
};

const CustomHits = connectHits(RenderCards);

const FiltersBar = ({ filters, updateFilters, updateQuery }) => {
  const flitersArray = [];

  for (const filter in filters.refinementList) {
    const filterName = REFINEMENT_LISTS.filter((f) => f.attribute === filter)[0].label;

    for (const value of filters.refinementList[filter]) {
      flitersArray.push(`${filterName}: ${value}`);
    }
  }

  for (const filter in filters.range) {
    const filterName = REFINEMENT_LISTS.filter((f) => f.attribute.includes(filter))[0].label;

    if (filters.range[filter].min) {
      const value = format(validateDate(filters.range[filter].min), 'MM/dd/yyyy');

      flitersArray.push(`${filterName}: From ${value}`);
    }

    if (filters.range[filter].max) {
      const value = format(validateDate(filters.range[filter].max), 'MM/dd/yyyy');

      flitersArray.push(`${filterName}: To ${value}`);
    }
  }

  if (flitersArray.length === 0) {
    return null;
  }

  return (
    <FiltersContainer>
      {flitersArray.map((filter) => (
        <Tags
          variant="outline-primary"
          key={filter}
          onClick={() => {
            const filterValuePair = filter.split(': ');

            const filterAttr = REFINEMENT_LISTS.filter((f) => f.label === filterValuePair[0])[0]
              .attribute;

            let newFilters = {};

            if (filters.refinementList[filterAttr]) {
              newFilters = {
                ...filters,
                refinementList: {
                  ...filters.refinementList,
                  [filterAttr]: filters.refinementList[filterAttr]?.filter(
                    (v) => v !== filterValuePair[1]
                  ),
                },
              };
            }

            if (filters.range[filterAttr]) {
              const newRangeFilter = {};

              if (filterValuePair[1].split(' ')[0] === 'To') {
                newRangeFilter.min = filters.range[filterAttr].min;
              }

              if (filterValuePair[1].split(' ')[0] === 'From') {
                newRangeFilter.max = filters.range[filterAttr].max;
              }

              newFilters = {
                ...filters,
                range: {
                  ...filters.range,
                  [filterAttr]: { ...newRangeFilter },
                },
              };
            }

            updateFilters({
              ...newFilters,
            });
            updateQuery({
              ...newFilters,
            });
          }}
        >
          <p>{filter}</p>
          <FontAwesomeIcon
            icon={faTimesCircle}
            className="pointer fa fa-times-circle"
            title="reset"
          />
        </Tags>
      ))}
    </FiltersContainer>
  );
};

export const Hits = ({
  toggleFilterByIncidentId,
  showDetails = false,
  sortByDatePublished,
  scrollTo,
}) => {
  const authorsModal = useModal();

  const submittersModal = useModal();

  const flagReportModal = useModal();

  return (
    <>
      <CustomHits
        toggleFilterByIncidentId={toggleFilterByIncidentId}
        authorsModal={authorsModal}
        submittersModal={submittersModal}
        flagReportModal={flagReportModal}
        showDetails={showDetails}
        scrollTo={scrollTo}
        sortByDatePublished={sortByDatePublished}
      />
      <CustomModal {...authorsModal} />
      <CustomModal {...submittersModal} />
      <CustomModal {...flagReportModal} />
    </>
  );
};

const DiscoverApp = React.memo((props) => {
  const searchInput = useRef(null);

  const [query, setQuery] = useQueryParams({
    s: StringParam,
    source_domain: StringParam,
    authors: StringParam,
    submitters: StringParam,
    incident_id: StringParam,
    flag: StringParam,
    epoch_incident_date_min: StringParam,
    epoch_incident_date_max: StringParam,
    epoch_date_published_min: StringParam,
    epoch_date_published_max: StringParam,
  });

  const [searchState, setSearchState] = useState({
    configure: {
      hitsPerPage: 30,
    },
    page: 1,
    query: '',
    refinementList: {},
    range: {},
  });

  const queryConfig = {
    s: StringParam,
    source_domain: StringParam,
    authors: StringParam,
    submitters: StringParam,
    incident_id: StringParam,
    flag: StringParam,
    epoch_incident_date_min: StringParam,
    epoch_incident_date_max: StringParam,
    epoch_date_published_min: StringParam,
    epoch_date_published_max: StringParam,
  };

  // const showDetails = searchState.refinementList?.incident_id?.length === 1;

  useEffect(() => {
    const cleanQuery = removeUndefinedAttributes(query);

    const querySearch = cleanQuery.s || '';

    delete cleanQuery.s;

    searchInput.current.value = querySearch;

    setSearchState({
      ...searchState,
      query: querySearch,
      refinementList: {
        ...convertStringToArray(cleanQuery),
      },
      range: {
        ...convertStringToRange(cleanQuery),
      },
    });
  }, [query]);

  const getQueryFromState = (searchState) => {
    let query = {};

    if (searchState && searchState.query !== '') {
      query.s = searchState.query;
    }

    if (searchState && searchState.refinementList !== {}) {
      query = {
        ...query,
        ...convertArrayToString(removeEmptyAttributes(searchState.refinementList)),
      };
    }

    if (searchState && searchState.range !== {}) {
      query = {
        ...query,
        ...convertRangeToQueryString(removeEmptyAttributes(searchState.range)),
      };
    }

    return query;
  };

  const toggleFilterByIncidentId = (incidentId) => {
    const incident_id = [];

    if (
      !searchState.refinementList ||
      !searchState.refinementList.incident_id ||
      searchState.refinementList.incident_id.length === 0
    ) {
      incident_id.push(incidentId);
    }

    const newSearchState = {
      ...searchState,
      refinementList: {
        ...searchState.refinementList,
        incident_id,
      },
    };

    setSearchState(newSearchState);
    setQuery(getQueryFromState(newSearchState), 'push');
  };

  const filters = useMemo(() => {
    return REFINEMENT_LISTS.map((list) => {
      if (list.attribute === 'epoch_incident_date' || list.attribute === 'epoch_date_published') {
        return (
          <RangeInputContainer key={list.attribute}>
            <RefinementListHeader className="refine_header">
              <FontAwesomeIcon icon={list.faIcon} className={list.faClasses} />
              {` ${list.label}`}
            </RefinementListHeader>
            <CustomRangeInput attribute={list.attribute} />
          </RangeInputContainer>
        );
      }
      return (
        <RefinementList
          key={list.attribute}
          attribute={list.attribute}
          placeholder={list.inputText}
          listLabel={list.label}
          faIcon={list.faIcon}
          faClasses={list.faClasses}
        />
      );
    });
  }, [searchState]);

  return (
    <LayoutHideSidebar {...props}>
      <Helmet>
        <title>Artifical Intelligence Incident Database</title>
      </Helmet>
      <QueryParams config={queryConfig}>
        {({ query, setQuery }) => (
          <>
            <Container>
              <InstantSearch
                indexName="aiid-emergency"
                searchClient={searchClient}
                searchState={searchState}
                onSearchStateChange={(searchState) => {
                  setSearchState({ ...searchState });
                  setQuery(getQueryFromState(searchState), 'push');
                }}
              >
                <Header>
                  <CustomSearchBox customRef={searchInput} defaultRefinement={query.s} />
                  <FiltersBar
                    filters={searchState}
                    updateFilters={setSearchState}
                    updateQuery={(newFilters) => setQuery(getQueryFromState(newFilters), 'push')}
                  />
                </Header>
                <SidesContainer>
                  <ResultsSide>
                    <HitsContainer>
                      <Hits toggleFilterByIncidentId={toggleFilterByIncidentId} />
                    </HitsContainer>
                    <StyledPagination />
                  </ResultsSide>
                  <FacetsSide>{filters}</FacetsSide>
                </SidesContainer>
              </InstantSearch>
            </Container>
          </>
        )}
      </QueryParams>
    </LayoutHideSidebar>
  );
});

export default DiscoverApp;
