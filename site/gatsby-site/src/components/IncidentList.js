import React from 'react';
import styled from 'styled-components';

const Date = styled.span`
  font-family: arial;
  margin-right: 1rem;
`;

const Link = styled.a`
  flex: 1;
`;

const IncidentList = ({ group }) => {
  return (
    <>
      {group.map((value, idx) => (
        <div key={`incident-group${idx}`}>
          <ul>
            {value['edges'].map((value) => (
              <li key={value['node']['id']} className="d-flex">
                <Date>{value['node']['date_published']}</Date>
                <Link href={`#${value['node']['mongodb_id']}`}>{value['node']['title']}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
};

export default IncidentList;
