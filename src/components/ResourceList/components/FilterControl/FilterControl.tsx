import * as React from 'react';
import {autobind, memoize} from '@shopify/javascript-utilities/decorators';
import {withAppProvider, WithAppProviderProps} from '../../../AppProvider';
import {contextTypes} from '../../types';
import {ComplexAction} from '../../../../types';
import {buttonsFrom, TextField, Icon, Tag, FormLayout} from '../../..';

import FilterCreator from './FilterCreator';
import {AppliedFilter, Filter, FilterType} from './types';
import * as styles from './FilterControl.scss';

export interface Props {
  searchValue?: string;
  appliedFilters?: AppliedFilter[];
  additionalAction?: ComplexAction;
  focused?: boolean;
  filters?: Filter[];
  onSearchBlur?(): void;
  onSearchChange(searchValue: string, id: string): void;
  onFiltersChange?(appliedFilters: AppliedFilter[]): void;
}

export type CombinedProps = Props & WithAppProviderProps;

export class FilterControl extends React.Component<CombinedProps> {
  static contextTypes = contextTypes;

  render() {
    const {selectMode, resourceName} = this.context;

    const {
      searchValue,
      appliedFilters = [],
      additionalAction,
      focused = false,
      filters = [],
      onSearchBlur,
      onSearchChange,
      polaris: {intl},
    } = this.props;

    const textFieldLabel = intl.translate(
      'Polaris.ResourceList.FilterControl.textFieldLabel',
      {
        resourceNamePlural: resourceName.plural.toLocaleLowerCase(),
      },
    );

    if (additionalAction) {
      additionalAction.disabled = selectMode;
    }

    const additionalActionButton =
      (additionalAction && buttonsFrom(additionalAction)) || null;

    const filterCreatorMarkup =
      filters.length > 0 ? (
        <FilterCreator
          resourceName={resourceName}
          filters={filters}
          onAddFilter={this.handleAddFilter}
          disabled={selectMode}
        />
      ) : null;

    const appliedFiltersMarkup = appliedFilters.map((appliedFilter) => {
      const activeFilterLabel = this.getFilterLabel(appliedFilter);
      const filterId = idFromFilter(appliedFilter);
      return (
        <li className={styles.AppliedFilter} key={filterId}>
          <Tag
            onRemove={this.getRemoveFilterCallback(filterId)}
            disabled={selectMode}
          >
            {activeFilterLabel}
          </Tag>
        </li>
      );
    });

    const appliedFiltersWrapper =
      appliedFilters.length > 0 ? (
        <ul className={styles.AppliedFilters}>{appliedFiltersMarkup}</ul>
      ) : null;

    return (
      <FormLayout>
        <TextField
          connectedLeft={filterCreatorMarkup}
          connectedRight={additionalActionButton}
          label={textFieldLabel}
          labelHidden
          placeholder={textFieldLabel}
          prefix={<Icon source="search" color="skyDark" />}
          value={searchValue}
          onChange={onSearchChange}
          onBlur={onSearchBlur}
          focused={focused}
          disabled={selectMode}
        />
        {appliedFiltersWrapper}
      </FormLayout>
    );
  }

  @autobind
  private handleAddFilter(newFilter: AppliedFilter) {
    const {onFiltersChange, appliedFilters = []} = this.props;

    if (!onFiltersChange) {
      return;
    }

    const foundFilter = appliedFilters.find(
      (appliedFilter) =>
        idFromFilter(appliedFilter) === idFromFilter(newFilter),
    );

    if (foundFilter) {
      return;
    }

    const newAppliedFilters = [...appliedFilters, newFilter];

    onFiltersChange(newAppliedFilters);
  }

  @memoize()
  private getRemoveFilterCallback(filterId: string) {
    return () => {
      this.handleRemoveFilter(filterId);
    };
  }

  private handleRemoveFilter(filterId: string) {
    const {onFiltersChange, appliedFilters = []} = this.props;

    if (!onFiltersChange) {
      return;
    }

    const foundIndex = appliedFilters.findIndex(
      (appliedFilter) => idFromFilter(appliedFilter) === filterId,
    );

    const newAppliedFilters =
      foundIndex >= 0
        ? [
            ...appliedFilters.slice(0, foundIndex),
            ...appliedFilters.slice(foundIndex + 1, appliedFilters.length),
          ]
        : [...appliedFilters];

    onFiltersChange(newAppliedFilters);
  }

  private getFilterLabel(appliedFilter: AppliedFilter): string {
    const {key, value, label} = appliedFilter;

    if (label) {
      return label;
    }

    const {filters = []} = this.props;

    const filter = filters.find((filter: any) => {
      const {minKey, maxKey} = filter;

      if (minKey || maxKey) {
        return filter.key === key || minKey === key || maxKey === key;
      }

      return filter.key === key;
    });

    if (!filter) {
      return value;
    }

    const filterLabelByType = this.findFilterLabelByType(filter, appliedFilter);
    const filterLabels = [filter.label, filter.operatorText, filterLabelByType];
    return filterLabels.join(' ');
  }

  private findFilterLabelByType(
    filter: Filter,
    appliedFilter: AppliedFilter,
  ): string {
    const {
      polaris: {intl},
    } = this.props;

    const {value: appliedFilterValue} = appliedFilter;

    if (filter.type === FilterType.Select) {
      const foundFilterOption = filter.options.find(
        (option) =>
          typeof option === 'string'
            ? option === appliedFilterValue
            : option.value === appliedFilterValue,
      );

      if (foundFilterOption) {
        return typeof foundFilterOption === 'string'
          ? foundFilterOption
          : foundFilterOption.label;
      }
    }

    if (filter.type === FilterType.DateSelector) {
      if (filter.key === appliedFilter.key) {
        const filterLabelKey = `Polaris.ResourceList.DateSelector.FilterLabelForValue.${
          appliedFilter.value
        }`;

        return intl.translationKeyExists(filterLabelKey)
          ? intl.translate(filterLabelKey)
          : appliedFilter.value;
      }

      if (appliedFilter.key === filter.maxKey) {
        return intl.translate(
          'Polaris.ResourceList.DateSelector.FilterLabelForValue.on_or_before',
          {
            date: formatDateForLabelDisplay(appliedFilter.value),
          },
        );
      }

      if (appliedFilter.key === filter.minKey) {
        return intl.translate(
          'Polaris.ResourceList.DateSelector.FilterLabelForValue.on_or_after',
          {
            date: formatDateForLabelDisplay(appliedFilter.value),
          },
        );
      }
    }

    return appliedFilterValue;
  }
}

function idFromFilter(appliedFilter: AppliedFilter) {
  return `${appliedFilter.key}-${appliedFilter.value}`;
}

function formatDateForLabelDisplay(date: string) {
  if (isNaN(new Date(date).getTime())) {
    return date;
  }

  return new Date(date.replace(/-/g, '/')).toLocaleDateString();
}

export default withAppProvider<Props>()(FilterControl);
