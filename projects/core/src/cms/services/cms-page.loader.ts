import { HttpErrorResponse } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PageContext } from '../../routing/models/page-context.model';
import { Adapter } from '../adapters/index';
import { CmsStructureModel } from '../model/page.model';
import { CmsStructureConfigService } from './cms-structure-config.service';

/**
 * Abstract class that can be used to implement custom loader logic
 * in order to load CMS structure from third-party CMS system.
 */
@Injectable({
  providedIn: 'root'
})
export abstract class CmsPageLoader<T> {
  constructor(
    protected cmsStructureConfigService: CmsStructureConfigService,
    @Inject(Adapter) protected adapter: Adapter<T, CmsStructureModel>
  ) {}

  /**
   * Abstract method must be used to load the page structure for a given `PageContext`.
   * The page can be loaded from alternative sources, as long as the structure
   * converts to the `CmsStructureModel`.
   *
   * @param pageContext The `PageContext` holding the page Id.
   */
  abstract load(_pageContext: PageContext): Observable<T>;

  /**
   * Returns an observable with the page structure. The page structure is
   * typically loaded from a backend, but can also be returned from static
   * configuration (see `CmsStructureConfigService`).
   */
  get(pageContext: PageContext): Observable<CmsStructureModel> {
    return this.cmsStructureConfigService
      .shouldIgnoreBackend(pageContext.id)
      .pipe(
        switchMap(loadFromConfig => {
          if (!loadFromConfig) {
            return this.load(pageContext).pipe(
              map(page => this.adapt(page)),
              catchError(error => {
                if (
                  error instanceof HttpErrorResponse &&
                  error.status === 400
                ) {
                  return of({});
                } else {
                  return throwError(error);
                }
              })
            );
          } else {
            return of({});
          }
        }),
        switchMap(page => this.mergeDefaultPageStructure(pageContext, page))
      );
  }

  /**
   *
   * The adapters can be used to serialize the backend reponse to
   * the UI model. Customers can inject multiple adapters in order to
   * convert to the target model, or override the adapt method in
   * their implementation.
   *
   * @param page the source that can be converted
   */
  adapt(page: T): CmsStructureModel {
    if (this.adapter) {
      return this.adapter.adapt(<T>page);
    }
    return <CmsStructureModel>page;
  }

  /**
   *
   * Merge default page structure inot the given `CmsStructureModel`.
   * This is benefitial for a fast setup of the UI without necessary
   * finegrained CMS setup.
   */
  private mergeDefaultPageStructure(
    pageContext: PageContext,
    pageStructure: CmsStructureModel
  ): Observable<CmsStructureModel> {
    return this.cmsStructureConfigService.mergeConfig(
      pageContext.id,
      pageStructure
    );
  }
}