import { throwError, Observable } from 'rxjs';
import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { IdList } from '../model/idList.model';
import { PageContext } from '../../routing/index';
import {
  CMSPage,
  PageType,
  CmsComponent,
  CmsComponentList
} from '../../occ/occ-models/index';
import { CmsPageLoader } from '../services/cms-page.loader';
import { CmsStructureConfig } from '../config/cms-structure.config';
import { Adapter } from '../adapters';
import { CmsStructureConfigService } from '../services/cms-structure-config.service';
import { CmsStructureModel } from '../model/page.model';

@Injectable()
export class OccCmsPageLoader extends CmsPageLoader<CMSPage> {
  protected headers = new HttpHeaders().set('Content-Type', 'application/json');

  constructor(
    private http: HttpClient,
    protected config: CmsStructureConfig,
    protected cmsStructureConfigService: CmsStructureConfigService,
    @Inject(Adapter) protected adapter: Adapter<CMSPage, CmsStructureModel>
  ) {
    super(cmsStructureConfigService, adapter);
  }

  protected getBaseEndPoint(): string {
    return (
      (this.config.server.baseUrl || '') +
      this.config.server.occPrefix +
      this.config.site.baseSite +
      '/cms'
    );
  }

  load(pageContext: PageContext, fields?: string): Observable<CMSPage> {
    let httpStringParams = '';

    if (pageContext.id !== 'smartedit-preview') {
      httpStringParams = 'pageType=' + pageContext.type;

      if (pageContext.type === PageType.CONTENT_PAGE) {
        httpStringParams =
          httpStringParams + '&pageLabelOrId=' + pageContext.id;
      } else {
        httpStringParams = httpStringParams + '&code=' + pageContext.id;
      }
    }

    if (fields !== undefined) {
      httpStringParams = httpStringParams + '&fields=' + fields;
    }

    return this.http.get(this.getBaseEndPoint() + `/pages`, {
      headers: this.headers,
      params: new HttpParams({
        fromString: httpStringParams
      })
    });
  }

  loadComponent<T extends CmsComponent>(
    id: string,
    pageContext: PageContext,
    fields?: string
  ): Observable<T> {
    return this.http
      .get<T>(this.getBaseEndPoint() + `/components/${id}`, {
        headers: this.headers,
        params: new HttpParams({
          fromString: this.getRequestParams(pageContext, fields)
        })
      })
      .pipe(catchError((error: any) => throwError(error.json())));
  }

  loadListComponents(
    idList: IdList,
    pageContext: PageContext,
    fields?: string,
    currentPage?: number,
    pageSize?: number,
    sort?: string
  ): Observable<CmsComponentList> {
    let requestParams = this.getRequestParams(pageContext, fields);
    if (currentPage !== undefined) {
      requestParams === ''
        ? (requestParams = requestParams + 'currentPage=' + currentPage)
        : (requestParams = requestParams + '&currentPage=' + currentPage);
    }
    if (pageSize !== undefined) {
      requestParams = requestParams + '&pageSize=' + pageSize;
    }
    if (sort !== undefined) {
      requestParams = requestParams + '&sort=' + sort;
    }

    return this.http
      .post<CmsComponentList>(this.getBaseEndPoint() + `/components`, idList, {
        headers: this.headers,
        params: new HttpParams({
          fromString: requestParams
        })
      })
      .pipe(catchError((error: any) => throwError(error.json())));
  }

  private getRequestParams(pageContext: PageContext, fields?: string): string {
    let requestParams = '';
    switch (pageContext.type) {
      case PageType.PRODUCT_PAGE: {
        requestParams = 'productCode=' + pageContext.id;
        break;
      }
      case PageType.CATEGORY_PAGE: {
        requestParams = 'categoryCode=' + pageContext.id;
        break;
      }
      case PageType.CATALOG_PAGE: {
        requestParams = 'catalogCode=' + pageContext.id;
        break;
      }
    }

    if (fields !== undefined) {
      requestParams === ''
        ? (requestParams = requestParams + 'fields=' + fields)
        : (requestParams = requestParams + '&fields=' + fields);
    }

    return requestParams;
  }

  get baseUrl(): string {
    return this.config.server.baseUrl || '';
  }
}