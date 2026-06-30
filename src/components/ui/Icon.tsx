'use client';

import {
  FontAwesomeIcon,
  type FontAwesomeIconProps,
} from '@fortawesome/react-fontawesome';

/**
 * Thin wrapper around FontAwesomeIcon so the rest of the app imports icons from
 * one place. Uses the free icon sets:
 *   import { faStar } from '@fortawesome/free-solid-svg-icons';
 *   import { faGithub } from '@fortawesome/free-brands-svg-icons';
 *   <Icon icon={faStar} />
 */
export default function Icon(props: FontAwesomeIconProps) {
  return <FontAwesomeIcon {...props} />;
}
